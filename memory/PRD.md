# BookCreator AI - PRD

## Problem Statement
Software per generare libretti PDF da pubblicare su Amazon KDP. Generazione automatica di contenuti usando AI (OpenAI GPT-5.2), immagini (GPT Image 1), con possibilità di modifiche manuali a testo, immagini, dimensioni e font.

## User Personas
- **Self-publishers**: Autori indipendenti che vogliono pubblicare su Amazon KDP
- **Content Creators**: Creatori di contenuti che vogliono trasformare idee in libri
- **Small Publishers**: Piccole case editrici che cercano strumenti di produzione rapida

## Core Requirements (Static)
1. Generazione contenuti AI (GPT-5.2)
2. Generazione immagini/copertine AI (GPT Image 1)
3. Supporto formati Amazon KDP (5"x8", 6"x9", 8.5"x11")
4. Modifica manuale testo e immagini
5. Personalizzazione font e dimensioni
6. Export PDF professionale
7. Interfaccia in italiano

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB
- **AI**: OpenAI GPT-5.2 (testo) + GPT Image 1 (immagini) via Emergent LLM Key
- **State Management**: Zustand con persistenza localStorage
- **PDF Generation**: jsPDF + html2canvas

## What's Been Implemented (Jan 2026)

### Dashboard (/)
- ✅ Lista progetti/libri con card animate
- ✅ Dialog creazione nuovo libro
- ✅ Generazione struttura AI (outline)
- ✅ Eliminazione libri con conferma

### Book Editor (/editor/:bookId)
- ✅ Editor testo con anteprima live
- ✅ Gestione capitoli (add/edit/delete)
- ✅ Generazione contenuto AI per capitoli
- ✅ Generazione immagini AI per capitoli
- ✅ Personalizzazione font/dimensioni/interlinea
- ✅ Selezione formato libro
- ✅ Auto-save con debounce

### Cover Designer (/cover/:bookId)
- ✅ Generazione copertina AI con stili (modern/classic/artistic/photo)
- ✅ Upload immagine personalizzata
- ✅ Overlay testo con colori/dimensioni personalizzabili

### PDF Preview (/preview/:bookId)
- ✅ Anteprima pagine navigabile
- ✅ Export PDF con formato corretto per Amazon KDP
- ✅ Supporto copertina, pagina titolo, capitoli, immagini

### Backend API
- ✅ CRUD libri (/api/books)
- ✅ CRUD capitoli (/api/books/:id/chapters)
- ✅ Generazione outline AI (/api/generate/outline)
- ✅ Generazione contenuto AI (/api/generate/content)
- ✅ Generazione immagini AI (/api/generate/image)
- ✅ Generazione copertina AI (/api/generate/cover)

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Core book creation flow
- ✅ AI text generation
- ✅ AI image generation
- ✅ PDF export

### P1 (High Priority)
- [ ] Drag & drop reorder chapters
- [ ] Bulk AI generation (tutti i capitoli in una volta)
- [ ] Template predefiniti per generi diversi

### P2 (Medium Priority)
- [ ] Collaborazione multi-utente
- [ ] Versioning/history dei libri
- [ ] Integrazione diretta con Amazon KDP API
- [ ] Support per più lingue oltre l'italiano

### P3 (Nice to Have)
- [ ] AI suggestions durante la scrittura
- [ ] SEO keywords per Amazon
- [ ] Preview 3D del libro fisico
- [ ] Export in formati aggiuntivi (EPUB, MOBI)

## Next Tasks
1. Implementare drag & drop per riordinare capitoli
2. Aggiungere generazione bulk di tutti i contenuti dei capitoli
3. Creare template predefiniti per diversi generi di libri
