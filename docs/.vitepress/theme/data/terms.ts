export interface TermDefinition {
  abbr: string
  full: string
  desc: string
  rfc?: string
  category: 'protocol-l4' | 'routing-bgp' | 'aws-underlay' | 'vpc-core' | 'hybrid-dx' | 'wan-tgw' | 'app-mesh' | 'security' | 'observability' | 'general'
  categoryLabel: string
  moduleLink?: string
}

export const NETWORK_TERMS: Record<string, TermDefinition> = {
  // --- Layer 1 & Subnetting / IPAM ---
  VLSM: {
    abbr: 'VLSM',
    full: 'Variable Length Subnet Masking',
    desc: 'Metode pembagian ruang alamat IP menjadi subnet-subnet dengan panjang mask berbeda sesuai kebutuhan aktual host, mengeliminasi pemborosan alamat pada pengalamatan classful.',
    rfc: 'RFC 4632 / RFC 1878',
    category: 'vpc-core',
    categoryLabel: 'IPAM & Subnetting',
    moduleLink: '/modules/01-subnetting-vlsm-ipam'
  },
  CIDR: {
    abbr: 'CIDR',
    full: 'Classless Inter-Domain Routing',
    desc: 'Standar pengalokasian IP dan routing tabel internet yang menggantikan sistem kelas IP (Class A/B/C) dengan notasi prefix slash (misal /24), memungkinkan supernetting dan agregasi rute efisien.',
    rfc: 'RFC 4632',
    category: 'vpc-core',
    categoryLabel: 'IPAM & Subnetting',
    moduleLink: '/modules/01-subnetting-vlsm-ipam'
  },
  IPAM: {
    abbr: 'IPAM',
    full: 'IP Address Management',
    desc: 'Sistem terpusat untuk perencanaan, alokasi hierarkis, pelacakan, dan audit ruang alamat IP publik/privat di seluruh multi-account dan multi-region cloud enterprise.',
    category: 'vpc-core',
    categoryLabel: 'IPAM & Subnetting',
    moduleLink: '/modules/01-subnetting-vlsm-ipam'
  },
  CGNAT: {
    abbr: 'CGNAT',
    full: 'Carrier-Grade NAT / Shared Address Space',
    desc: 'Blok alamat IPv4 khusus (100.64.0.0/10) untuk penyedia layanan dan infrastruktur cloud guna menghubungkan jaringan tanpa menabrak blok privat RFC 1918 pelanggan.',
    rfc: 'RFC 6598',
    category: 'vpc-core',
    categoryLabel: 'IPAM & Routing',
    moduleLink: '/modules/01-subnetting-vlsm-ipam'
  },

  // --- Layer 4 Transport & MTU/MSS ---
  PMTUD: {
    abbr: 'PMTUD',
    full: 'Path MTU Discovery',
    desc: 'Mekanisme penentuan Maximum Transmission Unit terkecil di sepanjang jalur transmisi L3 untuk mencegah fragmentasi paket dengan memanfaatkan bit Don\'t Fragment (DF) dan pesan ICMP Type 3 Code 4.',
    rfc: 'RFC 1191 / RFC 1981',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  PLPMTUD: {
    abbr: 'PLPMTUD',
    full: 'Packetization Layer Path MTU Discovery',
    desc: 'Teknik penemuan Path MTU tanpa ketergantungan pada pesan ICMP, melainkan dengan memverifikasi ACK segmen data TCP berukuran variatif secara adaptif untuk mengatasi ICMP Black Hole.',
    rfc: 'RFC 4821',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  MTU: {
    abbr: 'MTU',
    full: 'Maximum Transmission Unit',
    desc: 'Ukuran paket data L3 terbesar (dalam byte) termasuk header IP yang dapat ditransmisikan melalui antarmuka fisik/logis jaringan tanpa mengalami fragmentasi.',
    rfc: 'RFC 791 / RFC 8200',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  MSS: {
    abbr: 'MSS',
    full: 'Maximum Segment Size',
    desc: 'Ukuran payload data TCP murni terbesar yang dapat diterima oleh host dalam satu segmen jaringan (MTU dikurangi header IP 20 byte dan header TCP 20 byte).',
    rfc: 'RFC 879 / RFC 793',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  BDP: {
    abbr: 'BDP',
    full: 'Bandwidth-Delay Product',
    desc: 'Ukuran volume data maksimum (dalam bit atau byte) yang dapat berada dalam perjalanan pipa transmisi jaringan sekaligus (Bandwidth × RTT), menentukan ukuran TCP buffer optimal.',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  CWND: {
    abbr: 'CWND',
    full: 'Congestion Window',
    desc: 'Parameter state sisi pengirim TCP yang membatasi jumlah total data tanpa ACK yang boleh dikirim ke jaringan guna mencegah buffer overflow dan kongesti router transit.',
    rfc: 'RFC 5681',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  RWND: {
    abbr: 'RWND',
    full: 'Receiver Window (Advertised Window)',
    desc: 'Nilai pada header TCP yang dikirim penerima untuk memberitahu pengirim kapasitas buffer penerima saat itu, mencegah pengirim membanjiri host penerima (Flow Control).',
    rfc: 'RFC 793',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  RTT: {
    abbr: 'RTT',
    full: 'Round-Trip Time',
    desc: 'Durasi waktu (dalam milidetik) yang dibutuhkan paket data untuk dikirim dari source ke destination ditambah waktu yang dibutuhkan untuk menerima acknowledgment (ACK) kembali.',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  ECN: {
    abbr: 'ECN',
    full: 'Explicit Congestion Notification',
    desc: 'Ekstensi protokol IP dan TCP yang memungkinkan router perantara memberi sinyal kongesti jaringan ke endpoint tanpa harus melakukan packet drop (menggunakan bit ECE & CWR).',
    rfc: 'RFC 3168',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  ISN: {
    abbr: 'ISN',
    full: 'Initial Sequence Number',
    desc: 'Nomor urut 32-bit awal yang dipilih secara pseudo-random oleh masing-masing host TCP saat inisiasi 3-way handshake untuk menjamin keunikan stream dan mencegah serangan prediksi paket.',
    rfc: 'RFC 793 / RFC 6528',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },
  BBR: {
    abbr: 'BBR',
    full: 'Bottleneck Bandwidth and RTT',
    desc: 'Algoritma TCP Congestion Control modern berbasis model fisik yang mengoptimalkan throughput dan meminimalkan latensi antrean dengan mengestimasi kapasitas bottleneck dan min-RTT aktual.',
    category: 'protocol-l4',
    categoryLabel: 'Transport Layer (L4)',
    moduleLink: '/modules/02-tcp-mechanics-mtu-mss'
  },

  // --- Dynamic Routing & BGP ---
  BGP: {
    abbr: 'BGP',
    full: 'Border Gateway Protocol (BGP-4)',
    desc: 'Protokol routing eksterior berbasis Path Vector standar internet yang mempertukarkan informasi reachability prefix, AS-Path, dan atribut metrik antar Autonomous System.',
    rfc: 'RFC 4271',
    category: 'routing-bgp',
    categoryLabel: 'Dynamic Routing & BGP',
    moduleLink: '/modules/03-dynamic-routing-bgp-mastery'
  },
  ASN: {
    abbr: 'ASN',
    full: 'Autonomous System Number',
    desc: 'Pengidentifikasi numerik unik 16-bit (2-byte) atau 32-bit (4-byte) yang diberikan kepada suatu domain administratif jaringan untuk berpartisipasi dalam perutean BGP global maupun privat.',
    rfc: 'RFC 4271 / RFC 6793',
    category: 'routing-bgp',
    categoryLabel: 'Dynamic Routing & BGP',
    moduleLink: '/modules/03-dynamic-routing-bgp-mastery'
  },
  MED: {
    abbr: 'MED',
    full: 'Multi-Exit Discriminator',
    desc: 'Atribut BGP non-transitive opsional (Metric) yang dikirim ke external peer untuk menyarankan jalur masuk preferensial ke dalam AS pengirim jika terdapat beberapa titik interkoneksi.',
    rfc: 'RFC 4271',
    category: 'routing-bgp',
    categoryLabel: 'Dynamic Routing & BGP',
    moduleLink: '/modules/03-dynamic-routing-bgp-mastery'
  },
  BFD: {
    abbr: 'BFD',
    full: 'Bidirectional Forwarding Detection',
    desc: 'Protokol deteksi kegagalan link berkecepatan sub-detik (sub-second fault detection) dengan overhead rendah yang bertindak sebagai trigger failover cepat untuk sesi BGP, OSPF, atau static routing.',
    rfc: 'RFC 5880 / RFC 5881',
    category: 'routing-bgp',
    categoryLabel: 'Routing & Failover',
    moduleLink: '/modules/03-dynamic-routing-bgp-mastery'
  },
  ECMP: {
    abbr: 'ECMP',
    full: 'Equal-Cost Multi-Path',
    desc: 'Mekanisme forwarding routing layer 3 yang mendistribusikan trafik secara paralel melalui beberapa jalur dengan bobot/metrik biaya yang sama menggunakan algoritma hashing flow 5-tuple.',
    rfc: 'RFC 2991 / RFC 2992',
    category: 'routing-bgp',
    categoryLabel: 'Routing & Forwarding',
    moduleLink: '/modules/03-dynamic-routing-bgp-mastery'
  },
  LPM: {
    abbr: 'LPM',
    full: 'Longest Prefix Match',
    desc: 'Prinsip penentuan rute fundamental pada hardware router (FIB/TCAM) di mana rute dengan subnet mask paling spesifik (prefix length terbesar) selalu diprioritaskan di atas rute yang lebih umum.',
    rfc: 'RFC 1812',
    category: 'vpc-core',
    categoryLabel: 'Routing Table Core',
    moduleLink: '/modules/08-route-tables-lpm-ingress'
  },

  // --- Overlays & Tunneling ---
  GENEVE: {
    abbr: 'GENEVE',
    full: 'Generic Network Virtualization Encapsulation',
    desc: 'Protokol enkapsulasi jaringan overlay modern (UDP port 6081) dengan format header opsi TLV bervariabel fleksibel, menjadi protokol underlay standar untuk AWS Gateway Load Balancer.',
    rfc: 'RFC 8926',
    category: 'aws-underlay',
    categoryLabel: 'Network Overlays & SDN',
    moduleLink: '/modules/04-overlays-sdn-tunneling'
  },
  VXLAN: {
    abbr: 'VXLAN',
    full: 'Virtual Extensible LAN',
    desc: 'Protokol tunneling Layer 2 over Layer 3 (UDP port 4789) yang menyediakan 24-bit VNI (16 juta segmen virtual) untuk mengatasi batasan 4096 VLAN pada data center skala hyperscale.',
    rfc: 'RFC 7348',
    category: 'aws-underlay',
    categoryLabel: 'Network Overlays & SDN',
    moduleLink: '/modules/04-overlays-sdn-tunneling'
  },
  GRE: {
    abbr: 'GRE',
    full: 'Generic Routing Encapsulation',
    desc: 'Protokol tunneling IP-in-IP (IP protocol 47) yang membungkus beragam protokol jaringan dalam link point-to-point virtual antar router (misal TGW Connect).',
    rfc: 'RFC 2784',
    category: 'wan-tgw',
    categoryLabel: 'Network Overlays & SDN',
    moduleLink: '/modules/04-overlays-sdn-tunneling'
  },

  // --- AWS Underlay & Compute Hardware ---
  ENA: {
    abbr: 'ENA',
    full: 'Elastic Network Adapter',
    desc: 'Perangkat virtual controller jaringan kustom AWS berbasis chip Nitro yang menyediakan antarmuka PCIe Enhanced Networking hingga 100+ Gbps dengan offload hardware penuh.',
    category: 'aws-underlay',
    categoryLabel: 'AWS Nitro Underlay',
    moduleLink: '/modules/05-aws-underlay-hyperplane'
  },
  EFA: {
    abbr: 'EFA',
    full: 'Elastic Fabric Adapter',
    desc: 'Perangkat jaringan Nitro khusus untuk workload HPC dan AI/ML terdistribusi yang mendukung OS-bypass (libfabric API) untuk latensi ultra-rendah dan transfer data super cepat antar-node.',
    category: 'aws-underlay',
    categoryLabel: 'AWS Nitro Underlay',
    moduleLink: '/modules/06-eni-efa-prefix-delegation'
  },
  ENI: {
    abbr: 'ENI',
    full: 'Elastic Network Interface',
    desc: 'Komponen jaringan virtual yang merepresentasikan kartu antarmuka jaringan (vNIC) dalam VPC, memegang alamat IP privat primer/sekunder, Elastic IP, MAC address, dan Security Group.',
    category: 'aws-underlay',
    categoryLabel: 'AWS VPC Core',
    moduleLink: '/modules/06-eni-efa-prefix-delegation'
  },
  SRIOV: {
    abbr: 'SR-IOV',
    full: 'Single Root I/O Virtualization',
    desc: 'Spesifikasi standar PCIe yang memungkinkan satu perangkat antarmuka fisik PCIe dibagi menjadi beberapa Virtual Functions (VF) independen yang dapat diakses langsung oleh VM guest tanpa overhead hypervisor.',
    category: 'aws-underlay',
    categoryLabel: 'Hardware Virtualization',
    moduleLink: '/modules/05-aws-underlay-hyperplane'
  },
  DPDK: {
    abbr: 'DPDK',
    full: 'Data Plane Development Kit',
    desc: 'Kumpulan librari dan driver perangkat lunak user-space untuk memproses paket jaringan berkecepatan line-rate dengan melakukan polling langsung ke NIC hardware tanpa interupsi kernel Linux.',
    category: 'aws-underlay',
    categoryLabel: 'Data Plane Acceleration',
    moduleLink: '/modules/05-aws-underlay-hyperplane'
  },

  // --- VPC Core & Edge Gateways ---
  VPC: {
    abbr: 'VPC',
    full: 'Virtual Private Cloud',
    desc: 'Jaringan virtual privat yang terisolasi secara logis di cloud AWS, memberikan kontrol penuh atas alokasi IP, subnet, route table, network gateway, dan postur keamanan firewall.',
    category: 'vpc-core',
    categoryLabel: 'AWS VPC Core',
    moduleLink: '/modules/07-vpc-architecture-multi-cidr'
  },
  IGW: {
    abbr: 'IGW',
    full: 'Internet Gateway',
    desc: 'Komponen VPC AWS yang bersifat horizontally-scaled, redundant, dan highly-available tanpa batasan bandwidth fisik untuk memfasilitasi komunikasi dua arah antara instance publik dan Internet.',
    category: 'vpc-core',
    categoryLabel: 'Edge Gateways',
    moduleLink: '/modules/09-igw-eigw-nat-mechanics'
  },
  EIGW: {
    abbr: 'EIGW',
    full: 'Egress-Only Internet Gateway',
    desc: 'Komponen VPC stateful khusus IPv6 yang hanya mengizinkan inisiasi koneksi outbound dari subnet VPC ke internet dan secara otomatis memblokir seluruh koneksi inbound dari internet.',
    category: 'vpc-core',
    categoryLabel: 'Edge Gateways',
    moduleLink: '/modules/09-igw-eigw-nat-mechanics'
  },
  NAT: {
    abbr: 'NAT',
    full: 'Network Address Translation',
    desc: 'Metode pemetaan ruang alamat IP privat ke satu atau lebih alamat IP publik dengan memodifikasi header IP pada saat paket melintasi perangkat gateway.',
    rfc: 'RFC 3022',
    category: 'vpc-core',
    categoryLabel: 'NAT & Routing',
    moduleLink: '/modules/10-nat-gateways-public-private'
  },
  GWLB: {
    abbr: 'GWLB',
    full: 'Gateway Load Balancer',
    desc: 'Layanan AWS untuk mendistribusikan trafik jaringan secara transparan ke kumpulan appliance keamanan pihak ketiga (NGFW/IPS) menggunakan enkapsulasi GENEVE pada layer 3.',
    category: 'vpc-core',
    categoryLabel: 'Security Appliance Insertion',
    moduleLink: '/modules/14-gwlb-firewall-insertion'
  },

  // --- Hybrid Cloud & Direct Connect ---
  DXGW: {
    abbr: 'DXGW',
    full: 'Direct Connect Gateway',
    desc: 'Entitas perutean global AWS untuk mengagregasi koneksi Direct Connect dan menghubungkannya secara simultan ke beberapa VPC atau Transit Gateway di berbagai region global.',
    category: 'hybrid-dx',
    categoryLabel: 'Direct Connect & Hybrid',
    moduleLink: '/modules/17-direct-connect-gateway-dxgw'
  },
  VIF: {
    abbr: 'VIF',
    full: 'Virtual Interface',
    desc: 'Koneksi logis berbasis 802.1Q VLAN di atas link fisik Direct Connect (Private VIF untuk VPC, Public VIF untuk layanan publik AWS, Transit VIF untuk AWS Transit Gateway).',
    category: 'hybrid-dx',
    categoryLabel: 'Direct Connect & Hybrid',
    moduleLink: '/modules/16-direct-connect-vifs-bgp'
  },
  MACsec: {
    abbr: 'MACsec',
    full: 'Media Access Control Security',
    desc: 'Standar keamanan Layer 2 (IEEE 802.1AE) yang menyediakan enkripsi point-to-point pada kecepatan kawat (line-rate hingga 100 Gbps) pada link fisik Dedicated Direct Connect.',
    category: 'hybrid-dx',
    categoryLabel: 'Direct Connect & Hybrid',
    moduleLink: '/modules/15-direct-connect-macsec'
  },
  LAG: {
    abbr: 'LAG',
    full: 'Link Aggregation Group',
    desc: 'Protokol penggabungan beberapa koneksi fisik Ethernet menjadi satu link logis (IEEE 802.3ad LACP) untuk meningkatkan total kapasitas throughput dan menyediakan redundansi fisik.',
    category: 'hybrid-dx',
    categoryLabel: 'Direct Connect & Hybrid',
    moduleLink: '/modules/15-direct-connect-macsec'
  },

  // --- Transit Routing & WAN ---
  TGW: {
    abbr: 'TGW',
    full: 'AWS Transit Gateway',
    desc: 'Regional network transit hub di AWS yang menghubungkan ribuan VPC, Direct Connect Gateway, dan VPN dalam arsitektur hub-and-spoke dengan manajemen routing table terisolasi.',
    category: 'wan-tgw',
    categoryLabel: 'Enterprise WAN & TGW',
    moduleLink: '/modules/20-transit-gateway-core-routing'
  },
  SDWAN: {
    abbr: 'SD-WAN',
    full: 'Software-Defined Wide Area Network',
    desc: 'Arsitektur jaringan WAN tervirtualisasi yang memungkinkan enterprise mengelola dan mengoptimalkan konektivitas multi-cabang dan cloud secara terpusat dan dinamis.',
    category: 'wan-tgw',
    categoryLabel: 'Enterprise WAN & Cloud WAN',
    moduleLink: '/modules/22-cloud-wan-mesh-policy'
  },

  // --- Application Networking & DNS ---
  ALB: {
    abbr: 'ALB',
    full: 'Application Load Balancer',
    desc: 'Load balancer Layer 7 AWS yang mendukung fitur routing berbasis konten HTTP/HTTPS, header inspeksi, path routing, WebSocket, gRPC, dan autentikasi mTLS.',
    category: 'app-mesh',
    categoryLabel: 'Application Networking (L7)',
    moduleLink: '/modules/23-load-balancing-alb-nlb-mtls'
  },
  NLB: {
    abbr: 'NLB',
    full: 'Network Load Balancer',
    desc: 'Load balancer Layer 4 ultra-high performance AWS yang beroperasi pada jutaan request per detik dengan latensi mikrodetik dan IP statis/Elastic IP per Availability Zone.',
    category: 'app-mesh',
    categoryLabel: 'Application Networking (L4)',
    moduleLink: '/modules/23-load-balancing-alb-nlb-mtls'
  },
  mTLS: {
    abbr: 'mTLS',
    full: 'Mutual Transport Layer Security',
    desc: 'Proses autentikasi kriptografis dua arah di mana client dan server saling memverifikasi sertifikat digital X.509 masing-masing sebelum pertukaran data terenkripsi dimulai.',
    rfc: 'RFC 8446 / RFC 8705',
    category: 'app-mesh',
    categoryLabel: 'Application Security',
    moduleLink: '/modules/23-load-balancing-alb-nlb-mtls'
  },
  QUIC: {
    abbr: 'QUIC',
    full: 'Quick UDP Internet Connections',
    desc: 'Protokol transport berbasis UDP modern yang menjadi fondasi HTTP/3, menggabungkan fitur reliabilitas stream TCP, enkripsi TLS 1.3 bawaan, dan eliminasi Head-of-Line Blocking.',
    rfc: 'RFC 9000',
    category: 'protocol-l4',
    categoryLabel: 'Modern Transport Protocols',
    moduleLink: '/modules/25-cloudfront-global-accelerator'
  },
  CNI: {
    abbr: 'CNI',
    full: 'Container Network Interface',
    desc: 'Standar spesifikasi plug-in jaringan container Linux (seperti AWS VPC CNI pada EKS) untuk mengalokasikan antarmuka jaringan dan IP VPC asli secara langsung ke Pod.',
    category: 'app-mesh',
    categoryLabel: 'Container Networking',
    moduleLink: '/modules/26-vpc-lattice-container-cni'
  },

  // --- Security & Observability ---
  SG: {
    abbr: 'SG',
    full: 'Security Group',
    desc: 'Firewall virtual stateful tingkat antarmuka jaringan (ENI) di AWS yang secara otomatis melacak state koneksi dan mengizinkan paket respons kembali tanpa rule eksplisit.',
    category: 'security',
    categoryLabel: 'Network Security',
    moduleLink: '/modules/27-security-groups-nacls-conntrack'
  },
  NACL: {
    abbr: 'NACL',
    full: 'Network Access Control List',
    desc: 'Lapisan firewall virtual stateless tingkat subnet di AWS yang mengevaluasi aturan allow/deny secara berurutan berdasarkan nomor rule (Rule Number) untuk trafik inbound dan outbound.',
    category: 'security',
    categoryLabel: 'Network Security',
    moduleLink: '/modules/27-security-groups-nacls-conntrack'
  },
  WAF: {
    abbr: 'WAF',
    full: 'Web Application Firewall',
    desc: 'Layanan firewall Layer 7 yang memantau dan memblokir request HTTP/HTTPS berbahaya ke ALB, API Gateway, AppSync, atau CloudFront dari serangan web seperti SQLi dan XSS.',
    category: 'security',
    categoryLabel: 'Web Security & DDoS',
    moduleLink: '/modules/29-waf-shield-ddos-defense'
  },
  DDoS: {
    abbr: 'DDoS',
    full: 'Distributed Denial of Service',
    desc: 'Serangan siber berskala besar dari banyak sumber terdistribusi (botnet) yang membanjiri kapasitas jaringan atau aplikasi target untuk melumpuhkan ketersediaan layanan.',
    category: 'security',
    categoryLabel: 'Web Security & DDoS',
    moduleLink: '/modules/29-waf-shield-ddos-defense'
  },
  IPS: {
    abbr: 'IPS',
    full: 'Intrusion Prevention System',
    desc: 'Sistem keamanan jaringan aktif (seperti Suricata engine pada AWS Network Firewall) yang memeriksa muatan payload paket secara mendalam dan langsung memblokir ancaman.',
    category: 'security',
    categoryLabel: 'Network Security',
    moduleLink: '/modules/28-network-firewall-suricata-ips'
  },
  IDS: {
    abbr: 'IDS',
    full: 'Intrusion Detection System',
    desc: 'Sistem pemantauan jaringan pasif yang mendeteksi aktivitas mencurigakan atau pelanggaran kebijakan dan membangkitkan alert tanpa memodifikasi atau memblokir aliran trafik.',
    category: 'security',
    categoryLabel: 'Network Security',
    moduleLink: '/modules/28-network-firewall-suricata-ips'
  },
  ZTNA: {
    abbr: 'ZTNA',
    full: 'Zero Trust Network Access',
    desc: 'Model keamanan arsitektur yang mewajibkan verifikasi identitas, konteks perangkat, dan otorisasi granular berkelanjutan sebelum memberikan akses langsung ke aplikasi privat tanpa mengekspos jaringan.',
    category: 'security',
    categoryLabel: 'Zero Trust & Access',
    moduleLink: '/modules/19-client-vpn-verified-access'
  },
  VRF: {
    abbr: 'VRF',
    full: 'Virtual Routing and Forwarding',
    desc: 'Teknologi virtualisasi router yang memungkinkan beberapa instansi tabel routing independen berjalan secara berdampingan dalam satu router fisik atau logis tanpa saling mengganggu.',
    category: 'wan-tgw',
    categoryLabel: 'Routing & Segmentation',
    moduleLink: '/modules/20-transit-gateway-core-routing'
  },
  RAM: {
    abbr: 'RAM',
    full: 'AWS Resource Access Manager',
    desc: 'Layanan AWS yang memungkinkan pembagian resource lintas akun secara aman dalam AWS Organizations (misalnya berbagi Subnet VPC, Transit Gateway, dan IPAM Pools).',
    category: 'vpc-core',
    categoryLabel: 'Multi-Account Architecture',
    moduleLink: '/modules/07-vpc-architecture-multi-cidr'
  }
}

export function getTerm(abbr: string): TermDefinition | undefined {
  if (!abbr) return undefined
  const clean = abbr.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
  return NETWORK_TERMS[clean] || Object.values(NETWORK_TERMS).find(t => t.abbr.toUpperCase() === clean)
}
