# Zeszyt Trenera — offline sports club management app

Zeszyt Trenera (Polish for “Coach’s Notebook”) is a local-first, mobile-first
progressive web app (PWA) for sports coaches and club administrators. It helps
manage club members, track training attendance, record monthly membership fees,
and organize sports camps. The interface is available in Polish and English.

**Use the app:** [zeszyt-trenera.pl](https://zeszyt-trenera.pl)
· **Source code:** [pawel-mackiewicz/zeszyt-trenera](https://github.com/pawel-mackiewicz/zeszyt-trenera)

## App at a glance

| Property            | Details                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| Name                | Zeszyt Trenera                                                            |
| Category            | Sports club management software; digital coach’s notebook                 |
| Intended users      | Sports coaches and club administrators                                    |
| Main features       | Member roster, training attendance, membership fee tracking, sports camps |
| Platform            | Browser app with PWA installation support; designed for mobile use        |
| Offline use         | Core notebook workflows work offline after the app has loaded and cached  |
| Data storage        | Local browser database (IndexedDB, through Dexie)                         |
| Backups             | Manual JSON export and restore from the app menu                          |
| Interface languages | Polish and English                                                        |
| Website             | [zeszyt-trenera.pl](https://zeszyt-trenera.pl)                            |

## What can you do with Zeszyt Trenera?

- **Manage club members:** maintain a member roster and archive inactive members.
- **Track training attendance:** record who attended a session, review training
  history, and edit attendance records.
- **Track monthly membership fees:** record membership payments, review paid and
  unpaid members for a selected month, and see monthly payment summaries.
- **Prepare payment reminders:** open a prefilled reminder in a supported device’s
  SMS app for you to review and send.
- **Organize sports camps:** register camps, add club members or external
  participants, and record participant payments, discounts, refunds, and
  resignations.
- **Back up your notebook:** export local data to a JSON file and restore a saved
  backup from the app menu.
- **Use Polish or English:** switch the interface language from the app menu.

## Who is this app for?

Zeszyt Trenera is intended for coaches and administrators who need a sports club
member register, a training attendance tracker, a membership fee tracker, and a
sports camp participant register in one app. Its mobile interface and offline
support suit everyday club administration at training sessions and venues with
unreliable internet access.

## Getting started

1. Open [zeszyt-trenera.pl](https://zeszyt-trenera.pl) while connected to the internet.
2. Explore the demo with sample data, or leave demo mode to set up your own club
   and trainer details.
3. Add club members, record training attendance, and register membership payments.
4. Use the installation option in the app menu to add the PWA to your device where
   supported.
5. Export a backup from the app menu to keep a copy of your notebook.

## Frequently asked questions

### Can I track training attendance and membership fees offline?

Yes. After the initial online load and caching, the core notebook works with data
stored locally on your device. Loading the app for the first time and downloading
updates require an internet connection. Sending an SMS reminder uses your device’s
messaging app and mobile service.

### Where is my club’s data stored?

The notebook stores its records in your browser’s IndexedDB database. Local data
belongs to that browser profile and device. Clearing site data or losing the
device can remove the notebook, so keep exported backups. To move a notebook to
another browser or device, export a JSON backup and restore it there; restoring
a backup replaces the destination notebook’s existing data.

### Can I install it on my phone?

Yes, on browsers and devices that support PWA installation. Open the website and
use the installation option in the app menu. You can also use it directly in a
browser.

### Is Zeszyt Trenera available in English?

Yes. Both Polish and English interfaces are available through the language
switcher in the app menu. The Polish product name is Zeszyt Trenera, meaning
“Coach’s Notebook” in English.

## Po polsku: aplikacja do zarządzania klubem sportowym

**Zeszyt Trenera** to aplikacja dla trenerów i osób zarządzających klubem sportowym.
Łączy ewidencję zawodników, listy obecności na treningach, kontrolę miesięcznych
składek członkowskich oraz organizację obozów sportowych. Pozwala też prowadzić
ewidencję uczestników obozu, wpłat, zniżek i zwrotów oraz przygotowywać przypomnienia
SMS o składkach do wysłania z telefonu.

Aplikacja działa w przeglądarce i można ją zainstalować na telefonie jako PWA.
Po pierwszym uruchomieniu online i zapisaniu aplikacji w pamięci podręcznej
podstawowe funkcje działają bez internetu. Dane są przechowywane lokalnie
w przeglądarce; kopie zapasowe można eksportować i przywracać z pliku JSON.
Interfejs jest dostępny po polsku i angielsku.

**Otwórz aplikację:** [zeszyt-trenera.pl](https://zeszyt-trenera.pl).

## Development

The app uses Vue 3, TypeScript, Vite, Pinia, Vue Router, Vue I18n, and Dexie for
IndexedDB storage. The PWA service worker caches the application shell and assets
for offline use.

Requirements: Node.js 24 or newer and pnpm 11.4.0 (the version pinned in
`package.json`).

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

All application data writes go through application-layer use cases. Read queries
live in `src/read`, business write workflows in `src/write`, system workflows in
`src/system_management`, and the Vue interface in `src/ui`.

### Architecture notes

- [Dependency injection and adding new workflows](docs/dependency-injection.md)
- [Member deletion and dependency checks](docs/member.md)
