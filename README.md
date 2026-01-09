# AAAL Envanter Yönetim Sistemi

Bu proje, AAAL Robotik Atölyesi için geliştirilmiş, malzeme takibi ve talep yönetimi sağlayan bir web uygulamasıdır.

## 🚀 Başka Bir Bilgisayarda Çalıştırma Rehberi

Uygulamayı yeni bir bilgisayara kurmak için iki ana yöntem vardır. **Docker** yöntemi, hiçbir bağımlılıkla (Node.js sürümü vb.) uğraşmamanız için en kolay yöntemdir.

---

### Yöntem 1: Docker ile Çalıştırma (Önerilen)

Bu yöntem için bilgisayarınızda **Docker Desktop**'ın kurulu olması yeterlidir.

1.  **Kodu İndirin:** Proje klasörünü hedef bilgisayara kopyalayın veya Git kullanıyorsanız `git clone` yapın.
2.  **Dosya Konumu:** Terminali (CMD veya PowerShell) proje klasörünün içinde açın.
3.  **Başlatın:** Aşağıdaki komutu çalıştırın:
    ```bash
    docker-compose up -d --build
    ```
4.  **Erişim:** Tarayıcınızdan `http://localhost:3000` adresine gidin.

*Not: Verileriniz (malzemeler, kullanıcılar) `data/` klasöründe saklanır ve Docker konteyneri silinse bile kaybolmaz.*

---

### Yöntem 2: Yerel Node.js ile Çalıştırma

Bu yöntem için bilgisayarınızda **Node.js (v18 veya üzeri)** kurulu olmalıdır.

1.  **Bağımlılıkları Kurun:** Proje klasöründe terminali açın ve şu komutu çalıştırın:
    ```bash
    npm install
    ```
2.  **Uygulamayı Başlatın (Geliştirme Modu):**
    ```bash
    npm run dev
    ```
3.  **Erişim:** Tarayıcınızdan `http://localhost:3000` adresine gidin.

---

## 📂 Veri Saklama (Persistence)

Tüm veriler projenin içindeki `data/` klasöründe JSON formatında saklanır:
- `inventory.json`: Malzeme listesi
- `users.json`: Kullanıcı bilgileri
- `requests.json`: Malzeme talepleri
- `logs.json`: İşlem kayıtları

**Önemli:** Uygulamayı başka bir bilgisayara taşırken bu `data/` klasörünü de mutlaka kopyalamalısınız, aksi takdirde tüm kayıtlar sıfırlanır.

---

## 🚀 Başka Bilgisayarda Deployment (Kurulum)

Uygulamayı başka bir sunucuda veya bilgisayarda çalıştırmak için kodu indirmenize gerek yoktur. Sadece `docker-compose.prod.yml` dosyasını kullanabilirsiniz.

1.  Hedef bilgisayarda `aaal-envanter` adında bir klasör oluşturun.
2.  Bu klasörün içine `data` adında boş bir klasör oluşturun (veritabanı için).
3.  Bu klasörün içine projedeki `docker-compose.prod.yml` dosyasını kopyalayın ve adını `docker-compose.yml` yapın.
4.  Terminali açıp şu komutu çalıştırın:

```bash
docker-compose up -d
```