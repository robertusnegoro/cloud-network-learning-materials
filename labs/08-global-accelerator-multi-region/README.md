# Lab 08: Multi-Region Active-Active Ingress with AWS Global Accelerator

Blueprint arsitektur produksi **AWS Global Accelerator** dengan **Dual Static Anycast IPs**, perutean lintas region (**Singapore `ap-southeast-1`** dan **Jakarta `ap-southeast-3`**), **Client IP Preservation**, dan **Sub-10s BGP Underlay Failover**.

---

## 1. Topologi Arsitektur

```
                     [ Global End Users (Anycast BGP) ]
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
       [ 15.197.10.20 (Zone A) ]       [ 75.2.24.80 (Zone B) ]
                     └───────────────┬───────────────┘
                                     │
                 [ AWS Global Dedicated Private Backbone ]
                                     │
            ┌────────────────────────┴────────────────────────┐
            ▼ (Traffic Dial: 100%)                            ▼ (Traffic Dial: 100%)
  [ Singapore: ap-southeast-1 ]                     [ Jakarta: ap-southeast-3 ]
  • NLB Public (Cross-Zone)                         • NLB Public (Cross-Zone)
  • Client IP Preserved: TRUE                       • Client IP Preserved: TRUE
  • Target Group: Port 443                          • Target Group: Port 443
```

---

## 2. Fitur & Mekanisme Teknis

1. **Dual Static Anycast IPs (INZ A & B)**: Dua IP publik Anycast dialokasikan dari dua *Independent Network Zones* terpisah untuk redundansi BGP mutlak.
2. **Client IP Preservation Native**: Header L3 IPv4 Source IP tidak di-SNAT; IP publik asli klien diteruskan langsung ke target NLB dan backend EC2.
3. **Sub-10s Automated Failover**: Health check interval agresif (10s) dengan threshold count 2 memastikan waktu konvergensi failover ke Region DR terjadi dalam `< 10 detik` tanpa terhambat DNS caching client.
4. **Traffic Dials**: Memungkinkan penggeseran beban kerja (*traffic shifting*) secara dinamis antar region (misal: 80% Singapore : 20% Jakarta) via API/Terraform.

---

## 3. Deployment & Verifikasi

```bash
# Inisialisasi & Validasi Terraform
terraform init -backend=false
terraform validate

# Review Plan
terraform plan

# Deploy ke AWS
terraform apply -auto-approve

# Verifikasi Alamat Static Anycast IP
aws globalaccelerator list-accelerators --query "Accelerators[*].[Name,IpSets[0].IpAddresses,Status]" --output table
```
