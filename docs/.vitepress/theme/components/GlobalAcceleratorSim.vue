<script setup lang="ts">
import { ref, computed } from 'vue'

// --- State: Active Mode ---
const activeTab = ref<'anycast-failover' | 'custom-routing' | 'bdp-physics'>('anycast-failover')

// --- Tab 1: Anycast Ingress & Multi-Region Failover ---
interface ClientLocation {
  id: string
  name: string
  country: string
  clientIp: string
  nearestPoP: string
  popLatency: number // ms to local edge PoP
  asn: number
}

const clientLocations: ClientLocation[] = [
  { id: 'jkt', name: 'Jakarta (Indonesia)', country: 'ID', clientIp: '203.0.113.15', nearestPoP: 'CGK Edge PoP (Jakarta)', popLatency: 2, asn: 17974 },
  { id: 'lon', name: 'London (United Kingdom)', country: 'GB', clientIp: '198.51.100.42', nearestPoP: 'LHR Edge PoP (London)', popLatency: 3, asn: 2856 },
  { id: 'tyo', name: 'Tokyo (Japan)', country: 'JP', clientIp: '192.0.2.88', nearestPoP: 'NRT Edge PoP (Tokyo)', popLatency: 2, asn: 2516 },
  { id: 'nyc', name: 'New York (USA)', country: 'US', clientIp: '198.51.100.99', nearestPoP: 'JFK Edge PoP (New York)', popLatency: 3, asn: 701 },
  { id: 'sao', name: 'São Paulo (Brazil)', country: 'BR', clientIp: '203.0.113.200', nearestPoP: 'GRU Edge PoP (São Paulo)', popLatency: 4, asn: 27699 },
  { id: 'syd', name: 'Sydney (Australia)', country: 'AU', clientIp: '192.0.2.140', nearestPoP: 'SYD Edge PoP (Sydney)', popLatency: 2, asn: 7575 }
]

const selectedClientId = ref<string>('jkt')
const selectedClient = computed(() => clientLocations.find(c => c.id === selectedClientId.value) || clientLocations[0])

interface RegionEndpoint {
  id: string
  name: string
  regionCode: string
  endpointName: string
  targetType: 'NLB' | 'ALB' | 'EC2'
  privateIp: string
  healthStatus: 'HEALTHY' | 'UNHEALTHY' | 'OUTAGE'
  trafficDial: number // 0 to 100
  weight: number // 0 to 255
  baseTransitRtt: Record<string, number> // Backbone RTT from each PoP in ms
}

const regions = ref<RegionEndpoint[]>([
  {
    id: 'singapore',
    name: 'Singapore Primary Hub',
    regionCode: 'ap-southeast-1',
    endpointName: 'nlb-fintech-prod-singapore',
    targetType: 'NLB',
    privateIp: '10.100.1.25',
    healthStatus: 'HEALTHY',
    trafficDial: 100,
    weight: 255,
    baseTransitRtt: { jkt: 8, lon: 135, tyo: 65, nyc: 190, sao: 240, syd: 85 }
  },
  {
    id: 'frankfurt',
    name: 'Frankfurt European Hub',
    regionCode: 'eu-central-1',
    endpointName: 'nlb-fintech-prod-frankfurt',
    targetType: 'NLB',
    privateIp: '10.200.1.40',
    healthStatus: 'HEALTHY',
    trafficDial: 100,
    weight: 255,
    baseTransitRtt: { jkt: 145, lon: 12, tyo: 160, nyc: 78, sao: 155, syd: 220 }
  },
  {
    id: 'virginia',
    name: 'N. Virginia US Hub',
    regionCode: 'us-east-1',
    endpointName: 'nlb-fintech-prod-virginia',
    targetType: 'NLB',
    privateIp: '10.300.1.88',
    healthStatus: 'HEALTHY',
    trafficDial: 100,
    weight: 255,
    baseTransitRtt: { jkt: 195, lon: 72, tyo: 140, nyc: 6, sao: 110, syd: 160 }
  }
])

const clientIpPreservation = ref<boolean>(true)
const clientAffinity = ref<'NONE' | 'SOURCE_IP'>('NONE')
const backendSecurityGroupMode = ref<'ALLOW_ALL' | 'ALLOW_VPC_ONLY'>('ALLOW_ALL')

// Calculation of active target for the selected client
const healthyRegions = computed(() => regions.value.filter(r => r.healthStatus === 'HEALTHY' && r.trafficDial > 0 && r.weight > 0))

const activeRegionForClient = computed<RegionEndpoint | null>(() => {
  if (healthyRegions.value.length === 0) return null
  const clientKey = selectedClient.value.id
  // Find healthy region with lowest backbone RTT for this client
  let best = healthyRegions.value[0]
  let lowestRtt = best.baseTransitRtt[clientKey] || 999
  for (const r of healthyRegions.value) {
    const rtt = r.baseTransitRtt[clientKey] || 999
    if (rtt < lowestRtt) {
      lowestRtt = rtt
      best = r
    }
  }
  return best
})

const totalRttForClient = computed(() => {
  if (!activeRegionForClient.value) return 0
  const popLat = selectedClient.value.popLatency
  const transitLat = activeRegionForClient.value.baseTransitRtt[selectedClient.value.id] || 50
  return popLat + transitLat
})

// Direct public internet comparison latency (unaccelerated, with public hops)
const publicInternetRtt = computed(() => {
  if (!activeRegionForClient.value) return 0
  const base = activeRegionForClient.value.baseTransitRtt[selectedClient.value.id] || 50
  return Math.round(base * 1.45 + 35) // +45% congestion + DNS/ISP delays
})

// Header inspection computation
const packetHeader = computed(() => {
  const c = selectedClient.value
  const r = activeRegionForClient.value
  if (!r) return null

  const srcIp = clientIpPreservation.value ? c.clientIp : '10.100.254.12 (AWS AGA Internal ENI)'
  const dstIp = '15.197.10.20 (Static Anycast IP)'
  const backendTargetIp = r.privateIp
  const sgPermit = clientIpPreservation.value
    ? (backendSecurityGroupMode.value === 'ALLOW_ALL')
    : true // If preservation disabled, SG only needs to allow AGA internal VPC IP

  return {
    srcIp,
    dstIp,
    srcPort: 52184,
    dstPort: 443,
    protocol: 'TCP',
    tcpFlag: 'SYN (0x02)',
    backendTargetIp,
    sgPermit,
    sgReason: sgPermit
      ? (clientIpPreservation.value ? 'ALLOW: Security Group mengizinkan 0.0.0.0/0 (Client IP publik lolos).' : 'ALLOW: Security Group mengizinkan AGA internal subnet IP.')
      : 'DROP (REJECT): Security Group backend hanya mengizinkan 10.0.0.0/16! Paket dari Client IP publik di-drop pada Ingress ENI.'
  }
})

// --- Tab 2: Custom Routing Accelerator (CRA) Port Mapper ---
const subnetCidr = ref<'10.0.1.0/28' | '10.0.1.0/27' | '10.0.1.0/26'>('10.0.1.0/28')
const craBasePort = ref<number>(10000)
const craAppStartPort = ref<number>(8000)
const craAppEndPort = ref<number>(8009)
const craQueryPort = ref<number>(10023)

const subnetHostCount = computed(() => {
  if (subnetCidr.value === '10.0.1.0/28') return 11 // 16 - 5 AWS reserved
  if (subnetCidr.value === '10.0.1.0/27') return 27 // 32 - 5
  return 59 // 64 - 5
})

const craPortsPerHost = computed(() => Math.max(1, craAppEndPort.value - craAppStartPort.value + 1))
const totalCraPortsNeeded = computed(() => subnetHostCount.value * craPortsPerHost.value)
const maxListenerPort = computed(() => craBasePort.value + totalCraPortsNeeded.value - 1)

const craMappingResult = computed(() => {
  const qPort = craQueryPort.value
  const base = craBasePort.value
  const perHost = craPortsPerHost.value

  if (qPort < base || qPort > maxListenerPort.value) {
    return {
      valid: false,
      message: `Port ${qPort} berada di luar rentang port listener yang dialokasikan (${base} - ${maxListenerPort.value}).`
    }
  }

  const offset = qPort - base
  const hostIndex = Math.floor(offset / perHost)
  const portOffset = offset % perHost
  const targetPort = craAppStartPort.value + portOffset

  // Subnet start IP 10.0.1.0 -> first usable is .4 (AWS reserves .0, .1, .2, .3)
  const targetIpLastOctet = 4 + hostIndex
  const targetIp = `10.0.1.${targetIpLastOctet}`
  const eniId = `eni-09a8b7c6d5e${String(hostIndex).padStart(2, '0')}`

  return {
    valid: true,
    hostIndex: hostIndex + 1,
    targetIp,
    eniId,
    targetPort,
    cliCommand: `aws globalaccelerator allow-custom-routing-traffic \
  --endpoint-group-arn "arn:aws:globalaccelerator::123456789012:accelerator/xxx/listener/yyy/endpoint-group/zzz" \
  --endpoint-id "${eniId}" \
  --destination-addresses "${targetIp}" \
  --destination-ports ${targetPort}`
  }
})

// Sample mapping grid items
const craSampleMappings = computed(() => {
  const samples = []
  const base = craBasePort.value
  const perHost = craPortsPerHost.value
  const count = Math.min(10, totalCraPortsNeeded.value)
  for (let i = 0; i < count; i++) {
    const extPort = base + i
    const hIdx = Math.floor(i / perHost)
    const pOff = i % perHost
    samples.push({
      extPort,
      targetIp: `10.0.1.${4 + hIdx}`,
      destPort: craAppStartPort.value + pOff,
      hostName: `GameServer-${hIdx + 1}`
    })
  }
  return samples
})

// --- Tab 3: BDP & TCP Acceleration Physics ---
const bdpBandwidthMbps = ref<number>(100)
const bdpWanRttMs = ref<number>(180)

const bdpCalculated = computed(() => {
  const bwBps = (bdpBandwidthMbps.value * 1_000_000) / 8 // Bytes/sec
  const rttSec = bdpWanRttMs.value / 1000
  const bdpBytes = Math.round(bwBps * rttSec)
  const bdpKB = (bdpBytes / 1024).toFixed(1)
  const bdpMB = (bdpBytes / (1024 * 1024)).toFixed(2)

  // Handshake times
  const directHandshakeMs = bdpWanRttMs.value * 3 // 1.5 RTT TCP + 1.5 RTT TLS
  const gaEdgeHandshakeMs = 4 * 3 // 4ms local edge PoP RTT * 3
  const timeSavedMs = directHandshakeMs - gaEdgeHandshakeMs
  const speedupPercent = Math.round((directHandshakeMs / gaEdgeHandshakeMs) * 10) / 10

  return {
    bdpBytes,
    bdpKB,
    bdpMB,
    directHandshakeMs,
    gaEdgeHandshakeMs,
    timeSavedMs,
    speedupPercent
  }
})
</script>

<template>
  <div class="aga-simulator-card">
    <!-- Header -->
    <div class="aga-sim-header">
      <div class="flex items-center gap-3">
        <div class="aga-icon-badge">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
            <path d="M2 12h20"></path>
          </svg>
        </div>
        <div>
          <h3 class="aga-title">AWS Global Accelerator & Anycast BGP Simulator</h3>
          <p class="aga-subtitle">
            Simulasi interaktif perutean BGP Anycast, 2 Static IPs, failover sub-10s multi-region, pemetaan port deterministik CRA, dan mitigasi BDP.
          </p>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="aga-tab-bar">
      <button
        @click="activeTab = 'anycast-failover'"
        :class="['aga-tab-btn', { 'is-active': activeTab === 'anycast-failover' }]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
        </svg>
        <span>1. Anycast Ingress & Live BGP Failover</span>
      </button>

      <button
        @click="activeTab = 'custom-routing'"
        :class="['aga-tab-btn', { 'is-active': activeTab === 'custom-routing' }]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
          <line x1="6" y1="6" x2="6.01" y2="6"></line>
          <line x1="6" y1="18" x2="6.01" y2="18"></line>
        </svg>
        <span>2. Custom Routing Port Mapper (CRA)</span>
      </button>

      <button
        @click="activeTab = 'bdp-physics'"
        :class="['aga-tab-btn', { 'is-active': activeTab === 'bdp-physics' }]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        <span>3. BDP & TCP Acceleration Physics</span>
      </button>
    </div>

    <!-- TAB 1: Anycast Ingress & Failover -->
    <div v-if="activeTab === 'anycast-failover'" class="aga-tab-content">
      <!-- Top Row: Client Origin Selection & IP Static Badge -->
      <div class="grid-2">
        <div class="aga-panel">
          <div class="panel-header">
            <span class="panel-tag">Step 1</span>
            <h4 class="panel-title">Pilih Lokasi Klien Global</h4>
          </div>
          <div class="client-chips-grid">
            <button
              v-for="c in clientLocations"
              :key="c.id"
              @click="selectedClientId = c.id"
              :class="['client-chip', { 'is-selected': selectedClientId === c.id }]"
            >
              <span class="font-bold">{{ c.name }}</span>
              <span class="text-xs opacity-75">ASN {{ c.asn }} • IP: {{ c.clientIp }}</span>
            </button>
          </div>
        </div>

        <div class="aga-panel">
          <div class="panel-header">
            <span class="panel-tag">Architecture</span>
            <h4 class="panel-title">AWS Anycast Ingress (Independent Network Zones)</h4>
          </div>
          <div class="inz-boxes-container">
            <div class="inz-box">
              <div class="inz-header">
                <span class="badge-inz">Network Zone A</span>
                <span class="text-xs text-emerald-400 font-mono">BGP Active (AS16509)</span>
              </div>
              <div class="inz-ip">15.197.10.20</div>
              <div class="text-xs opacity-75 mt-1">PoP Terdekat: <strong>{{ selectedClient.nearestPoP }}</strong> ({{ selectedClient.popLatency }} ms)</div>
            </div>

            <div class="inz-box">
              <div class="inz-header">
                <span class="badge-inz">Network Zone B</span>
                <span class="text-xs text-emerald-400 font-mono">BGP Redundant (AS16509)</span>
              </div>
              <div class="inz-ip">75.2.24.80</div>
              <div class="text-xs opacity-75 mt-1">Dual-homed BGP Path terisolasi fisik & logis.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Middle: Multi-Region Endpoints Configuration -->
      <div class="aga-panel mt-4">
        <div class="panel-header flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="panel-tag">Step 2</span>
            <h4 class="panel-title">Regional Backend Endpoint Groups & Health Checks</h4>
          </div>
          <div class="text-xs text-[var(--vp-c-text-2)]">
            Ubah status kesehatan untuk menguji <strong>Instant Sub-10s Underlay Failover</strong>
          </div>
        </div>

        <div class="region-cards-grid">
          <div
            v-for="r in regions"
            :key="r.id"
            :class="['region-card', { 'is-active-target': activeRegionForClient?.id === r.id, 'is-unhealthy': r.healthStatus !== 'HEALTHY' }]"
          >
            <div class="region-card-header">
              <div>
                <span class="font-bold text-sm">{{ r.name }}</span>
                <div class="text-xs font-mono opacity-75">{{ r.regionCode }} • {{ r.endpointName }}</div>
              </div>
              <span :class="['status-badge', r.healthStatus === 'HEALTHY' ? 'is-healthy' : 'is-down']">
                {{ r.healthStatus }}
              </span>
            </div>

            <div class="region-controls-body">
              <!-- Health Status Button Toggle -->
              <div class="control-row">
                <span class="text-xs font-medium">Status Probe:</span>
                <div class="flex gap-1">
                  <button
                    @click="r.healthStatus = 'HEALTHY'"
                    :class="['btn-tiny', { 'is-selected-healthy': r.healthStatus === 'HEALTHY' }]"
                  >
                    Healthy
                  </button>
                  <button
                    @click="r.healthStatus = 'UNHEALTHY'"
                    :class="['btn-tiny', { 'is-selected-down': r.healthStatus === 'UNHEALTHY' }]"
                  >
                    Simulate Outage
                  </button>
                </div>
              </div>

              <!-- Traffic Dial Slider -->
              <div class="control-row">
                <div class="flex justify-between text-xs">
                  <span>Traffic Dial:</span>
                  <strong>{{ r.trafficDial }}%</strong>
                </div>
                <input type="range" min="0" max="100" v-model.number="r.trafficDial" class="aga-slider" />
              </div>

              <!-- Endpoint Weight Slider -->
              <div class="control-row">
                <div class="flex justify-between text-xs">
                  <span>Endpoint Weight:</span>
                  <strong>{{ r.weight }} / 255</strong>
                </div>
                <input type="range" min="0" max="255" v-model.number="r.weight" class="aga-slider" />
              </div>

              <!-- RTT from Selected Client -->
              <div class="region-rtt-stat">
                <span class="text-xs">Backbone Transit RTT:</span>
                <span class="font-mono font-bold text-xs">{{ r.baseTransitRtt[selectedClient.id] }} ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Realtime Ingress Analysis & Packet Header Inspector -->
      <div class="grid-2 mt-4">
        <!-- Live Route & Latency Result -->
        <div class="aga-panel">
          <div class="panel-header">
            <span class="panel-tag">Routing Decision</span>
            <h4 class="panel-title">Hasil Keputusan Perutean Anycast & Latensi</h4>
          </div>

          <div v-if="activeRegionForClient" class="route-success-box">
            <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Trafik Berhasil Diakselerasi ke {{ activeRegionForClient.name }}</span>
            </div>

            <div class="route-hops-flow mt-3">
              <div class="hop-item">
                <div class="hop-label">1. Client</div>
                <div class="hop-value">{{ selectedClient.name }}</div>
              </div>
              <div class="hop-arrow">── {{ selectedClient.popLatency }}ms ──></div>
              <div class="hop-item">
                <div class="hop-label">2. Anycast PoP</div>
                <div class="hop-value">{{ selectedClient.nearestPoP }}</div>
              </div>
              <div class="hop-arrow">── {{ activeRegionForClient.baseTransitRtt[selectedClient.id] }}ms ──></div>
              <div class="hop-item">
                <div class="hop-label">3. Target VPC</div>
                <div class="hop-value">{{ activeRegionForClient.regionCode }} ({{ activeRegionForClient.privateIp }})</div>
              </div>
            </div>

            <div class="latency-comparison-bar mt-4">
              <div class="lat-stat-card bg-emerald-950/40 border-emerald-800">
                <div class="text-xs opacity-75">Total Latensi Global Accelerator</div>
                <div class="text-xl font-mono font-black text-emerald-400">{{ totalRttForClient }} ms</div>
                <div class="text-[10px] text-emerald-300">Dedicated AWS Backbone • Zero Jitter</div>
              </div>

              <div class="lat-stat-card bg-rose-950/30 border-rose-900">
                <div class="text-xs opacity-75">Internet Publik (Unaccelerated)</div>
                <div class="text-xl font-mono font-black text-rose-400">~{{ publicInternetRtt }} ms</div>
                <div class="text-[10px] text-rose-300">Multi-Hop Public ISP Peering</div>
              </div>
            </div>

            <div class="failover-stat-note mt-3">
              <strong>⚡ Waktu Konvergensi Failover:</strong> Jika Region ini down, BGP underlay AWS mengalihkan trafik dalam <strong>&lt; 10 detik</strong> (dibandingkan DNS Route 53 yang butuh 60s+ akibat cache client TTL).
            </div>
          </div>

          <div v-else class="route-fail-box">
            <div class="text-rose-400 font-bold text-sm">🚨 ALL ENDPOINTS DOWN / TRAFFIC DIAL 0%</div>
            <p class="text-xs text-[var(--vp-c-text-2)] mt-1">
              Seluruh target regional dalam keadaan Unhealthy atau Traffic Dial disetel ke 0. Global Accelerator tidak dapat meneruskan paket.
            </p>
          </div>
        </div>

        <!-- Packet Header & Client IP Preservation Inspector -->
        <div class="aga-panel">
          <div class="panel-header flex justify-between items-center">
            <div>
              <span class="panel-tag">Deep Packet Inspection</span>
              <h4 class="panel-title">Packet Header & Security Group Evaluation</h4>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs font-semibold">Client IP Preservation:</label>
              <button
                @click="clientIpPreservation = !clientIpPreservation"
                :class="['toggle-pill', { 'is-on': clientIpPreservation }]"
              >
                {{ clientIpPreservation ? 'ON (Preserved)' : 'OFF (SNAT)' }}
              </button>
            </div>
          </div>

          <div v-if="packetHeader" class="packet-inspector-content">
            <div class="table-responsive-wrapper">
              <table class="packet-table">
                <tbody>
                  <tr>
                    <td class="font-bold">Layer 3 Source IP:</td>
                    <td class="font-mono text-amber-400 font-bold">{{ packetHeader.srcIp }}</td>
                  </tr>
                  <tr>
                    <td class="font-bold">Layer 3 Destination IP:</td>
                    <td class="font-mono text-cyan-400">{{ packetHeader.dstIp }}</td>
                  </tr>
                  <tr>
                    <td class="font-bold">Layer 4 Port & Protocol:</td>
                    <td class="font-mono">Src: {{ packetHeader.srcPort }} ➔ Dst: {{ packetHeader.dstPort }} ({{ packetHeader.protocol }})</td>
                  </tr>
                  <tr>
                    <td class="font-bold">Target Backend Private IP:</td>
                    <td class="font-mono text-indigo-300">{{ packetHeader.backendTargetIp }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Security Group Simulator Toggle -->
            <div class="sg-sim-section mt-3">
              <div class="flex justify-between items-center text-xs">
                <span>Security Group Ingress Rule pada Target:</span>
                <select v-model="backendSecurityGroupMode" class="sg-select">
                  <option value="ALLOW_ALL">Allow 0.0.0.0/0 (Internet Public)</option>
                  <option value="ALLOW_VPC_ONLY">Allow 10.0.0.0/16 Only (Internal Subnet)</option>
                </select>
              </div>

              <div :class="['sg-result-box', packetHeader.sgPermit ? 'is-permit' : 'is-drop']">
                <div class="font-bold text-xs flex items-center gap-1">
                  <span>{{ packetHeader.sgPermit ? '✅ PACKET PERMITTED' : '🚨 PACKET DROPPED BY SECURITY GROUP' }}</span>
                </div>
                <div class="text-xs opacity-90 mt-1">{{ packetHeader.sgReason }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Custom Routing Port Mapper -->
    <div v-if="activeTab === 'custom-routing'" class="aga-tab-content">
      <div class="grid-2">
        <div class="aga-panel">
          <div class="panel-header">
            <span class="panel-tag">Config</span>
            <h4 class="panel-title">Parameter Custom Routing Accelerator (CRA)</h4>
          </div>

          <div class="space-y-3 mt-2">
            <div>
              <label class="text-xs font-semibold block mb-1">Target VPC Subnet CIDR:</label>
              <select v-model="subnetCidr" class="aga-input">
                <option value="10.0.1.0/28">10.0.1.0/28 (11 EC2 Usable Instances)</option>
                <option value="10.0.1.0/27">10.0.1.0/27 (27 EC2 Usable Instances)</option>
                <option value="10.0.1.0/26">10.0.1.0/26 (59 EC2 Usable Instances)</option>
              </select>
            </div>

            <div class="grid-2">
              <div>
                <label class="text-xs font-semibold block mb-1">App Port Start (EC2):</label>
                <input type="number" v-model.number="craAppStartPort" class="aga-input" />
              </div>
              <div>
                <label class="text-xs font-semibold block mb-1">App Port End (EC2):</label>
                <input type="number" v-model.number="craAppEndPort" class="aga-input" />
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold block mb-1">Base External Listener Port:</label>
              <input type="number" v-model.number="craBasePort" class="aga-input" />
            </div>

            <div class="cra-summary-badge">
              <div class="text-xs">
                Port Eksternal yang Dialokasikan: <strong>{{ craBasePort }} - {{ maxListenerPort }}</strong> ({{ totalCraPortsNeeded }} Total Port)
              </div>
            </div>
          </div>
        </div>

        <div class="aga-panel">
          <div class="panel-header">
            <span class="panel-tag">Port Query Engine</span>
            <h4 class="panel-title">Kueri Pemetaan Deterministik Socket</h4>
          </div>

          <div class="space-y-3 mt-2">
            <div>
              <label class="text-xs font-semibold block mb-1">Masukkan Port Listener Eksternal:</label>
              <input
                type="number"
                v-model.number="craQueryPort"
                :min="craBasePort"
                :max="maxListenerPort"
                class="aga-input font-mono font-bold text-cyan-400"
              />
            </div>

            <div v-if="craMappingResult.valid" class="cra-result-card">
              <div class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Hasil Pemetaan Deterministik:</div>
              <div class="table-responsive-wrapper mt-2">
                <table class="packet-table">
                  <tbody>
                    <tr>
                      <td class="font-bold">Port Eksternal Anycast:</td>
                      <td class="font-mono text-cyan-400 font-bold">:{{ craQueryPort }}</td>
                    </tr>
                    <tr>
                      <td class="font-bold">Target EC2 Private IP:</td>
                      <td class="font-mono text-amber-400 font-bold">{{ craMappingResult.targetIp }} (Host #{{ craMappingResult.hostIndex }})</td>
                    </tr>
                    <tr>
                      <td class="font-bold">Target Destination Port:</td>
                      <td class="font-mono text-emerald-400 font-bold">:{{ craMappingResult.targetPort }}</td>
                    </tr>
                    <tr>
                      <td class="font-bold">Target ENI ID:</td>
                      <td class="font-mono">{{ craMappingResult.eniId }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="mt-3">
                <div class="text-[11px] font-bold text-[var(--vp-c-text-2)] mb-1">CLI Otorisasi Socket (Allow Traffic):</div>
                <pre class="cra-code-block"><code>{{ craMappingResult.cliCommand }}</code></pre>
              </div>
            </div>

            <div v-else class="cra-error-card">
              {{ craMappingResult.message }}
            </div>
          </div>
        </div>
      </div>

      <!-- Sample Mapping Matrix Table -->
      <div class="aga-panel mt-4">
        <div class="panel-header">
          <span class="panel-tag">Lookup Table</span>
          <h4 class="panel-title">Tabel Pemetaan Port Deterministik (10 Sampel Pertama)</h4>
        </div>
        <div class="table-responsive-wrapper mt-2">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Port Eksternal Anycast</th>
                <th>Target Instance</th>
                <th>Target Private IP</th>
                <th>Target App Port</th>
                <th>Use Case / Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in craSampleMappings" :key="s.extPort" :class="{ 'is-highlighted-row': s.extPort === craQueryPort }">
                <td class="font-mono font-bold text-cyan-400">:{{ s.extPort }}</td>
                <td>{{ s.hostName }}</td>
                <td class="font-mono text-amber-400">{{ s.targetIp }}</td>
                <td class="font-mono text-emerald-400">:{{ s.destPort }}</td>
                <td class="text-xs text-[var(--vp-c-text-2)]">Dedicated UDP/TCP Game Room Session</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: BDP & TCP Acceleration Physics -->
    <div v-if="activeTab === 'bdp-physics'" class="aga-tab-content">
      <div class="grid-2">
        <div class="aga-panel">
          <div class="panel-header">
            <span class="panel-tag">Physics Formula</span>
            <h4 class="panel-title">Kalkulator Bandwidth-Delay Product (BDP)</h4>
          </div>

          <div class="space-y-4 mt-2">
            <div>
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span>Bandwidth Jaringan (Throughput):</span>
                <span class="text-cyan-400 font-mono">{{ bdpBandwidthMbps }} Mbps</span>
              </div>
              <input type="range" min="10" max="1000" step="10" v-model.number="bdpBandwidthMbps" class="aga-slider" />
            </div>

            <div>
              <div class="flex justify-between text-xs font-semibold mb-1">
                <span>Round-Trip Time WAN (RTT):</span>
                <span class="text-amber-400 font-mono">{{ bdpWanRttMs }} ms</span>
              </div>
              <input type="range" min="10" max="350" step="5" v-model.number="bdpWanRttMs" class="aga-slider" />
            </div>

            <div class="bdp-math-box">
              <div class="text-xs font-bold text-[var(--vp-c-text-2)]">Formula BDP:</div>
              <div class="font-mono text-sm mt-1 text-indigo-300">
                BDP = ({{ bdpBandwidthMbps }} Mbps / 8) × ({{ bdpWanRttMs }} ms / 1000)
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-cyan-400">{{ bdpCalculated.bdpKB }} KB</span>
                <span class="text-xs text-[var(--vp-c-text-2)]">({{ bdpCalculated.bdpMB }} MB Buffer yang harus selalu "in-flight")</span>
              </div>
            </div>
          </div>
        </div>

        <div class="aga-panel">
          <div class="panel-header">
            <span class="panel-tag">Acceleration Impact</span>
            <h4 class="panel-title">Perbandingan Inisiasi Koneksi TCP + TLS 1.3</h4>
          </div>

          <div class="space-y-3 mt-2">
            <div class="lat-stat-card bg-rose-950/30 border-rose-900">
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-rose-300">Direct Public Internet Handshake:</span>
                <span class="font-mono font-bold text-rose-400">{{ bdpCalculated.directHandshakeMs }} ms</span>
              </div>
              <div class="text-[11px] text-[var(--vp-c-text-2)] mt-1">
                Client harus menunggu 3x WAN RTT ({{ bdpWanRttMs }}ms × 3) melintasi internet publik sebelum byte data pertama dikirim.
              </div>
            </div>

            <div class="lat-stat-card bg-emerald-950/40 border-emerald-800">
              <div class="flex justify-between items-center">
                <span class="text-xs font-bold text-emerald-300">AWS Global Accelerator Edge Handshake:</span>
                <span class="font-mono font-bold text-emerald-400">{{ bdpCalculated.gaEdgeHandshakeMs }} ms</span>
              </div>
              <div class="text-[11px] text-emerald-200 mt-1">
                TCP & TLS Handshake diselesaikan di Edge PoP terdekat (~4 ms RTT). Koneksi ke backend menggunakan AWS Backbone yang sudah pre-warmed.
              </div>
            </div>

            <div class="acceleration-highlight">
              <div class="text-xs text-indigo-300 font-bold">🚀 Kecepatan Inisiasi Koneksi:</div>
              <div class="text-xl font-black text-white mt-1">
                {{ bdpCalculated.speedupPercent }}x Lebih Cepat
                <span class="text-xs font-normal text-indigo-200">({{ bdpCalculated.timeSavedMs }} ms dihemat per koneksi baru)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aga-simulator-card {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.aga-sim-header {
  margin-bottom: 1.25rem;
}

.aga-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  flex-shrink: 0;
}

.aga-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.aga-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.aga-tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
  padding-bottom: 0.75rem;
  margin-bottom: 1.25rem;
}

.aga-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.825rem;
  font-weight: 600;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.aga-tab-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
}

.aga-tab-btn.is-active {
  background: var(--vp-c-brand-1);
  color: #ffffff;
  border-color: var(--vp-c-brand-1);
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.aga-panel {
  padding: 1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.panel-tag {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  text-transform: uppercase;
}

.panel-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.client-chips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.5rem;
}

.client-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.5rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.client-chip:hover {
  border-color: var(--vp-c-brand-1);
}

.client-chip.is-selected {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
  color: #60a5fa;
}

.inz-boxes-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.inz-box {
  padding: 0.75rem;
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px dashed var(--vp-c-divider);
}

.inz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.badge-inz {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  background: #3b82f6;
  color: #fff;
  border-radius: 4px;
}

.inz-ip {
  font-family: monospace;
  font-size: 1rem;
  font-weight: 700;
  color: #38bdf8;
}

.region-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
}

.region-card {
  padding: 0.85rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.region-card.is-active-target {
  border-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.15);
}

.region-card.is-unhealthy {
  opacity: 0.65;
  border-color: #ef4444;
}

.region-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.status-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.status-badge.is-healthy {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.status-badge.is-down {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.region-controls-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.btn-tiny {
  padding: 0.2rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.btn-tiny.is-selected-healthy {
  background: #10b981;
  color: #fff;
  border-color: #10b981;
}

.btn-tiny.is-selected-down {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}

.aga-slider {
  width: 100%;
  accent-color: #3b82f6;
  height: 4px;
}

.region-rtt-stat {
  display: flex;
  justify-content: space-between;
  padding-top: 0.35rem;
  border-top: 1px solid var(--vp-c-divider);
}

.route-success-box {
  padding: 0.85rem;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
}

.route-fail-box {
  padding: 0.85rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
}

.route-hops-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.75rem;
}

.hop-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hop-label {
  font-size: 0.65rem;
  color: var(--vp-c-text-2);
}

.hop-value {
  font-weight: 700;
  font-size: 0.75rem;
}

.hop-arrow {
  font-family: monospace;
  font-size: 0.7rem;
  color: #38bdf8;
}

.latency-comparison-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.lat-stat-card {
  padding: 0.65rem;
  border-radius: 6px;
  border: 1px solid;
}

.failover-stat-note {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.toggle-pill {
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 9999px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.toggle-pill.is-on {
  background: #10b981;
  color: #fff;
  border-color: #10b981;
}

.packet-table {
  width: 100%;
  font-size: 0.75rem;
  border-collapse: collapse;
}

.packet-table td {
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
}

.sg-sim-section {
  padding: 0.65rem;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
}

.sg-select {
  padding: 0.2rem 0.4rem;
  font-size: 0.75rem;
  border-radius: 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.sg-result-box {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.sg-result-box.is-permit {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.sg-result-box.is-drop {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.aga-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.cra-summary-badge {
  padding: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 6px;
}

.cra-result-card {
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.cra-error-card {
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  font-size: 0.8rem;
  color: #f87171;
}

.cra-code-block {
  padding: 0.5rem;
  background: #0f172a;
  color: #38bdf8;
  border-radius: 4px;
  font-size: 0.7rem;
  overflow-x: auto;
}

.matrix-table {
  width: 100%;
  font-size: 0.75rem;
  border-collapse: collapse;
}

.matrix-table th, .matrix-table td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--vp-c-divider);
  text-align: left;
}

.matrix-table th {
  background: var(--vp-c-bg-soft);
  font-weight: 700;
}

.is-highlighted-row {
  background: rgba(59, 130, 246, 0.15);
}

.bdp-math-box {
  padding: 0.75rem;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}

.acceleration-highlight {
  padding: 0.85rem;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  border: 1px solid #4338ca;
  border-radius: 8px;
}
</style>
