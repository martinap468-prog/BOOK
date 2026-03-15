# Quaderni Cognitivi - PRD

## Problem Statement
Software per generare quaderni di esercizi cognitivi per persone con Alzheimer. Esercizi con grafica semplice, font grandi, struttura a capitoli. Possibilità di scegliere tipo di esercizio, difficoltà, numero di esercizi, modalità colore.

## User Personas
- **Caregiver/Familiari**: Chi assiste persone con Alzheimer e cerca materiali di stimolazione
- **Terapisti occupazionali**: Professionisti che lavorano con pazienti con demenza
- **Case di riposo/RSA**: Strutture che necessitano materiali per attività cognitive

## Core Requirements (Static)
1. Tipi di esercizi multipli (sequenze, calcoli, trova intruso, collega, copia, riconoscimento, memoria)
2. 3 livelli di difficoltà (facile, medio, difficile)
3. Font grandi e leggibili (16-24pt)
4. Modalità B/N e colori
5. 1 esercizio per pagina
6. Export PDF per stampa
7. Interfaccia in italiano

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Zustand
- **Backend**: FastAPI + MongoDB
- **PDF Generation**: jsPDF

## What's Been Implemented (Jan 2026)

### Dashboard
- ✅ Lista quaderni con card
- ✅ Creazione nuovo quaderno con impostazioni
- ✅ Eliminazione quaderni

### Book Editor
- ✅ Sidebar con lista capitoli ed esercizi
- ✅ Generazione capitoli con esercizi AI
- ✅ Visualizzazione esercizi in formato grande
- ✅ Navigazione tra esercizi
- ✅ Salvataggio automatico

### Tipi di Esercizi
- ✅ **Completa la Sequenza** - Numeri mancanti
- ✅ **Calcoli** - Operazioni matematiche semplici
- ✅ **Trova l'Intruso** - Elemento non appartenente al gruppo
- ✅ **Collega** - Abbina parole a definizioni
- ✅ **Copia e Scrivi** - Ricalco parole/frasi
- ✅ **Riconoscimento** - Identifica oggetti
- ✅ **Memoria** - Trova le coppie

### PDF Preview & Export
- ✅ Anteprima navigabile
- ✅ Export PDF formato Amazon KDP

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Generazione esercizi automatica
- ✅ Struttura capitoli
- ✅ Export PDF

### P1 (High Priority)
- [ ] Generazione immagini AI per esercizi grafici (labirinti, colorare, trova differenze)
- [ ] Pagina soluzioni alla fine del quaderno
- [ ] Template predefiniti per livelli diversi

### P2 (Medium Priority)
- [ ] Esportazione in formati multipli (A4, Letter)
- [ ] Condivisione quaderni tra utenti
- [ ] Statistiche di utilizzo

### P3 (Nice to Have)
- [ ] App mobile per caregiver
- [ ] Versione interattiva digitale
- [ ] Integrazione con cliniche/RSA

## Next Tasks
1. Aggiungere generazione immagini AI per labirinti e "trova le differenze"
2. Creare pagina soluzioni automatica
3. Implementare più variazioni negli esercizi esistenti
