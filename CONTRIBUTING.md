# Panduan Kontribusi (Contributing Guidelines)

Terima kasih atas minat Anda untuk berkontribusi pada **Cloud Network Engineering Mastery**! Panduan ini dirancang untuk memastikan seluruh modul, komponen interaktif, dan blueprint IaC mempertahankan standar teknis tertinggi.

---

## 1. Standar Konten & Bahasa (Content Standards)

### A. Aturan Bilingual
- **Narasi & Penjelasan**: Wajib ditulis dalam **Bahasa Indonesia** baku, jelas, dan profesional.
- **Terminologi Jaringan & Cloud**: Wajib 100% menggunakan istilah asli **Bahasa Inggris** (*Subnet, Route Table, Transit Gateway, Cloud WAN, Payload, Handshake, Encapsulation, Peering, Advertisement, Prefix List, Appliance Mode, Underlay, Overlay, Flow Logs*). Jangan menerjemahkan istilah baku industri.

### B. Tingkat Kedalaman Teknis (SME / Principal Level)
- Hindari penjelasan umum/permukaan.
- Setiap modul harus mengacu pada **standar RFC** yang relevan, **analisis packet header L2–L7**, dan **mekanisme underlay AWS** (Nitro, ENA, Hyperplane).
- Sertakan skenario kegagalan (*failure modes*), *asymmetric routing traps*, dan studi kasus investigasi produksi.

---

## 2. Struktur & Konvensi Kode

### A. Modul Markdown VitePress (`docs/modules/`)
- Setiap file wajib memiliki YAML frontmatter:
  ```markdown
  ---
  title: "Modul XX: Judul Modul"
  description: "Deskripsi singkat mengenai topik modul."
  ---
  ```
- Diagram alur arsitektur wajib menggunakan Mermaid (` ```mermaid `).
- Catatan teknis menggunakan VitePress callout containers (`::: tip`, `::: warning`, `::: danger`, `::: info`).
- Formula matematika menggunakan LaTeX math (`$...$` untuk inline, `$$...$$` untuk display).

### B. Komponen Interaktif Vue 3 (`docs/.vitepress/theme/components/`)
- Gunakan Single File Component (SFC) dengan `<script setup lang="ts">`.
- Pastikan desain responsif menggunakan Tailwind-style CSS atau CSS variables VitePress.
- Daftarkan komponen baru di `docs/.vitepress/theme/index.ts`.
- Gunakan `<ClientOnly>` jika komponen mengakses API browser saat dirender di markdown.

### C. Blueprint Terraform IaC (`labs/`)
- Struktur setiap lab:
  - `main.tf`: Definisi resource dan provider AWS (`~> 5.0`).
  - `variables.tf`: Deklarasi variabel dengan `type` dan `description` yang jelas.
  - `outputs.tf`: Nilai output yang informatif (VPC ID, TGW ID, ENI IP, dll.).
  - `README.md`: Diagram topologi dan langkah deployment/verifikasi.
- Pastikan tag standar selalu disertakan (`Project`, `Environment`, `ManagedBy = "Terraform"`).

---

## 3. Alur Pengajuan Kontribusi (Workflow)

1. **Fork & Buat Branch**:
   ```bash
   git checkout -b feat/nama-fitur-atau-modul
   ```

2. **Lakukan Perubahan & Uji Secara Lokal**:
   ```bash
   npm install
   npm run dev
   ```

3. **Verifikasi Build (Wajib Gate)**:
   ```bash
   npm run build
   ```
   > Pastikan perintah `npm run build` selesai dengan exit code `0` tanpa error SSR hydration atau broken link.

4. **Validasi Terraform (Jika menyentuh `labs/`)**:
   ```bash
   cd labs/<lab-directory>
   terraform init -backend=false
   terraform validate
   ```

5. **Kirim Pull Request**:
   - Jelaskan latar belakang teknis dan perubahan yang dilakukan.
   - Sertakan bukti screenshot jika menambahkan atau memodifikasi komponen UI interaktif.

---

## 4. Bantuan & AI Code Assistants
Repository ini mendukung panduan instruksi untuk AI coding assistants:
- [`AGENTS.md`](./AGENTS.md)
- [`CLAUDE.md`](./CLAUDE.md)
- [`GEMINI.md`](./GEMINI.md)
