# Project Overview ⋆˚꩜｡
BookIt is a mobile-first web application that makes it easier to discover books. Users can scan an ISBN or search by title to instantly view book information, save books for later, revisit recent searches, and compare books side by side.

<img width="200" alt="IMG_1364" src="https://github.com/user-attachments/assets/1692c80f-bf7d-4b3d-b14d-ce72beb2be14" />
<img width="200" alt="saved" src="https://github.com/user-attachments/assets/a9054f90-b556-414b-8809-f5a94ed3d41e" />


## Project Information ⋆˚࿔

**Project Title:** BookIt! A Book Identification and Discovery Application with OCR

**Developer:** Janelle Tan

**University:** Multimedia University (MMU)

**Degree:** Bachelor of Computer Science (Hons.), specialising in Software Engineering

**Project Type:** Final Year Project

**Academic Year:** 2025–2026

## Features ⭑.ᐟ

### Book Discovery
- Scan a book's ISBN using the device camera
- OCR-based ISBN detection with barcode scanning as a fallback
- Search books by title or ISBN
- View detailed book information, including author, description, ratings, genres, and publication details

### Personal Library
- Save books for future reference
- View recently scanned and searched books
- Remove books from the saved list

### Book Comparison
- Compare two books side by side
- View differences in ratings, authors, genres, publication year, and other key details

### User Account
- User registration and login
- Secure authentication
- Manage saved books across sessions

## Tech Stack (-⊙⩊⊙)𝇌

| Category | Technologies |
|----------|--------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | Next.js API Routes |
| **Database & Authentication** | Supabase (PostgreSQL, Authentication, Row-Level Security) |
| **OCR & Barcode Scanning** | Tesseract.js, ZXing |
| **API** | Hardcover GraphQL API |
| **Design** | Figma |

## Screenshots .✦ ݁˖

### ISBN Scanner

<img width="200" alt="IMG_1364" src="https://github.com/user-attachments/assets/1692c80f-bf7d-4b3d-b14d-ce72beb2be14" />
<img width="200" alt="IMG_1413" src="https://github.com/user-attachments/assets/e90ef12c-dbbf-4a82-84c7-49a22dc164fa" />
<img width="200" alt="IMG_1414" src="https://github.com/user-attachments/assets/ad1f77b1-9358-4468-a095-dce5519f2f88" />


### Book Details

<img width="200" alt="book-details-1" src="https://github.com/user-attachments/assets/76e45a3f-d217-4fc7-824d-edb40e26eeaf" />
<img width="200" alt="book-details-2" src="https://github.com/user-attachments/assets/19f6e305-7ba9-4bc0-9f5d-08b4aac8600c" />


### Compare Books

<img width="200" alt="compare-book-1" src="https://github.com/user-attachments/assets/cf426f1b-4c66-4046-9040-72fa6fa3425d" />
<img width="200" alt="compare-book-2" src="https://github.com/user-attachments/assets/89318bac-6382-44bd-9b71-497ff2e5a40e" />
<img width="200" alt="compare-book-3" src="https://github.com/user-attachments/assets/20a88539-1819-4794-89dc-dbb80c8bb567" />


### Saved Books

<img width="200" alt="saved" src="https://github.com/user-attachments/assets/f229be9c-40c2-488c-a7bb-23928d8e7c4d" />


### Recent Books

<img width="200" alt="recent" src="https://github.com/user-attachments/assets/c93dd216-c91a-43e8-b81c-e12108d6acce" />

### Search

<img width="200" alt="IMG_1415" src="https://github.com/user-attachments/assets/835fae88-b2dc-4275-8f5f-caa72308ae55" />

## Installation (๑'ᵕ'๑)⸝*

1. Clone the repository.

```bash
git clone <repository-url>
cd bookit
```

2. Install the project dependencies.

```bash
npm install
```

3. Create a `.env.local` file in the project root and add the required environment variables.

4. Start the development server.

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open `http://localhost:3000` in your browser.

## Environment Variables ✧˖°.

Create a `.env.local` file in the project root and configure the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

HARDCOVER_API_TOKEN=

...
```
