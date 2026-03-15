import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Clock, 
  FileText,
  Sparkles,
  Brain,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import useBookStore, { defaultSettings } from '../store/bookStore';
import { bookApi } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { books, setBooks, addBook, removeBook, setCurrentBook, setLoading, isLoading } = useBookStore();
  const [showNewBookDialog, setShowNewBookDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  
  const [newBook, setNewBook] = useState({
    title: 'Quaderno di Esercizi',
    subtitle: '',
    author: '',
    settings: { ...defaultSettings }
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const data = await bookApi.getAll();
      setBooks(data);
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('Errore nel caricamento dei quaderni');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async () => {
    if (!newBook.title.trim()) {
      toast.error('Inserisci un titolo');
      return;
    }

    try {
      const created = await bookApi.create(newBook);
      addBook(created);
      setCurrentBook(created);
      setShowNewBookDialog(false);
      setNewBook({
        title: 'Quaderno di Esercizi',
        subtitle: '',
        author: '',
        settings: { ...defaultSettings }
      });
      
      toast.success('Quaderno creato!');
      navigate(`/editor/${created.id}`);
    } catch (error) {
      console.error('Error creating book:', error);
      toast.error('Errore nella creazione');
    }
  };

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    
    try {
      await bookApi.delete(bookToDelete.id);
      removeBook(bookToDelete.id);
      toast.success('Quaderno eliminato');
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Errore nell\'eliminazione');
    } finally {
      setShowDeleteDialog(false);
      setBookToDelete(null);
    }
  };

  const openBook = async (book) => {
    try {
      const fullBook = await bookApi.getOne(book.id);
      setCurrentBook(fullBook);
      navigate(`/editor/${book.id}`);
    } catch (error) {
      console.error('Error opening book:', error);
      toast.error('Errore nell\'apertura');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTotalExercises = (book) => {
    return book.chapters?.reduce((acc, ch) => acc + (ch.exercises?.length || 0), 0) || 0;
  };

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard">
      {/* Header */}
      <header className="border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-accent" strokeWidth={1.5} />
            <div>
              <h1 className="text-2xl font-light tracking-tight text-primary">
                Quaderni Cognitivi
              </h1>
              <p className="text-xs text-muted-foreground">Esercizi per la stimolazione cognitiva</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowNewBookDialog(true)}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="new-book-btn"
          >
            <Plus className="w-4 h-4" />
            Nuovo Quaderno
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-primary mb-4">
            Crea quaderni di esercizi personalizzati
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Genera esercizi cognitivi per persone con Alzheimer: sequenze, calcoli, memoria, riconoscimento e molto altro.
          </p>
        </section>

        {/* Books Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-xl font-medium text-primary mb-2">Nessun quaderno ancora</h3>
            <p className="text-muted-foreground mb-6">
              Crea il tuo primo quaderno di esercizi cognitivi.
            </p>
            <Button 
              onClick={() => setShowNewBookDialog(true)}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="w-4 h-4" />
              Crea il primo quaderno
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="books-grid">
            {books.map((book, index) => (
              <Card 
                key={book.id}
                className="book-card aspect-[3/4] bg-white border border-border/60 shadow-sm cursor-pointer group relative overflow-hidden rounded-lg animate-fadeInUp hover:shadow-lg transition-shadow"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => openBook(book)}
                data-testid={`book-card-${book.id}`}
              >
                {/* Cover */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center justify-center p-6">
                  <Brain className="w-16 h-16 text-primary/30 mb-4" strokeWidth={1} />
                  <h3 className="text-lg font-medium text-primary text-center line-clamp-2 mb-2">
                    {book.title}
                  </h3>
                  {book.subtitle && (
                    <p className="text-sm text-muted-foreground text-center line-clamp-1">
                      {book.subtitle}
                    </p>
                  )}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6">
                  <p className="text-white text-center mb-4">
                    {book.chapters?.length || 0} capitoli<br />
                    {getTotalExercises(book)} esercizi
                  </p>
                  <Button variant="secondary" size="sm">
                    Apri Quaderno
                  </Button>
                </div>

                {/* Delete Button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookToDelete(book);
                    setShowDeleteDialog(true);
                  }}
                  data-testid={`delete-book-${book.id}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>

                {/* Footer Info */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(book.updated_at)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* New Book Dialog */}
      <Dialog open={showNewBookDialog} onOpenChange={setShowNewBookDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="new-book-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light">Nuovo Quaderno</DialogTitle>
            <DialogDescription>
              Crea un nuovo quaderno di esercizi cognitivi.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                placeholder="Es: Esercizi di Memoria"
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Sottotitolo</Label>
              <Input
                id="subtitle"
                placeholder="Es: Livello Facile"
                value={newBook.subtitle}
                onChange={(e) => setNewBook({ ...newBook, subtitle: e.target.value })}
                data-testid="input-subtitle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Autore</Label>
              <Input
                id="author"
                placeholder="Nome autore"
                value={newBook.author}
                onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                data-testid="input-author"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficoltà Predefinita</Label>
                <Select 
                  value={newBook.settings.difficulty}
                  onValueChange={(v) => setNewBook({
                    ...newBook,
                    settings: { ...newBook.settings, difficulty: v }
                  })}
                >
                  <SelectTrigger data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Facile</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="hard">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modalità Colore</Label>
                <Select 
                  value={newBook.settings.color_mode}
                  onValueChange={(v) => setNewBook({
                    ...newBook,
                    settings: { ...newBook.settings, color_mode: v }
                  })}
                >
                  <SelectTrigger data-testid="select-color-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bw">Bianco e Nero</SelectItem>
                    <SelectItem value="color">A Colori</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dimensione Font</Label>
              <Select 
                value={String(newBook.settings.font_size)}
                onValueChange={(v) => setNewBook({
                  ...newBook,
                  settings: { ...newBook.settings, font_size: parseInt(v) }
                })}
              >
                <SelectTrigger data-testid="select-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16">16pt - Normale</SelectItem>
                  <SelectItem value="18">18pt - Grande</SelectItem>
                  <SelectItem value="20">20pt - Molto Grande</SelectItem>
                  <SelectItem value="24">24pt - Extra Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleCreateBook}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="create-book-btn"
            >
              <Plus className="w-4 h-4" />
              Crea Quaderno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo quaderno?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il quaderno "{bookToDelete?.title}" sarà eliminato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-btn"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
