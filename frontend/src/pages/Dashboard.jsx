import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Clock, 
  FileText,
  Sparkles,
  ArrowRight
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
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import useBookStore, { defaultSettings } from '../store/bookStore';
import { bookApi, generateApi } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { books, setBooks, addBook, removeBook, setCurrentBook, setLoading, isLoading } = useBookStore();
  const [showNewBookDialog, setShowNewBookDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    topic: '',
    description: '',
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
      toast.error('Errore nel caricamento dei libri');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (withAI = false) => {
    if (!newBook.title.trim()) {
      toast.error('Inserisci un titolo per il libro');
      return;
    }

    setIsGenerating(true);
    try {
      let bookData = { ...newBook };
      let chapters = [];

      if (withAI && newBook.topic.trim()) {
        toast.info('Generazione struttura in corso...');
        const outline = await generateApi.outline(
          newBook.topic, 
          newBook.settings.chapter_count
        );
        
        bookData.title = outline.title || newBook.title;
        bookData.description = outline.description || newBook.description;
        
        chapters = outline.chapters.map((ch, index) => ({
          id: crypto.randomUUID(),
          title: ch.title,
          content: ch.summary || '',
          order: index,
          images: []
        }));
      }

      const created = await bookApi.create(bookData);
      
      // Add chapters if generated
      if (chapters.length > 0) {
        created.chapters = chapters;
        await bookApi.update(created.id, { chapters });
      }

      addBook(created);
      setCurrentBook(created);
      setShowNewBookDialog(false);
      setNewBook({
        title: '',
        author: '',
        topic: '',
        description: '',
        settings: { ...defaultSettings }
      });
      
      toast.success('Libro creato con successo!');
      navigate(`/editor/${created.id}`);
    } catch (error) {
      console.error('Error creating book:', error);
      toast.error('Errore nella creazione del libro');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    
    try {
      await bookApi.delete(bookToDelete.id);
      removeBook(bookToDelete.id);
      toast.success('Libro eliminato');
    } catch (error) {
      console.error('Error deleting book:', error);
      toast.error('Errore nell\'eliminazione del libro');
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
      toast.error('Errore nell\'apertura del libro');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard">
      {/* Header */}
      <header className="border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-primary" strokeWidth={1.5} />
            <h1 className="text-2xl font-light tracking-tight text-primary">
              BookCreator AI
            </h1>
          </div>
          <Button 
            onClick={() => setShowNewBookDialog(true)}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="new-book-btn"
          >
            <Plus className="w-4 h-4" />
            Nuovo Libro
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-primary mb-4">
            Crea il tuo libro con l'AI
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Genera contenuti, illustrazioni e copertine professionali per Amazon KDP in pochi click.
          </p>
        </section>

        {/* Books Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="aspect-[2/3] loading-pulse bg-muted" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-xl font-medium text-primary mb-2">Nessun libro ancora</h3>
            <p className="text-muted-foreground mb-6">
              Inizia creando il tuo primo libro con l'aiuto dell'intelligenza artificiale.
            </p>
            <Button 
              onClick={() => setShowNewBookDialog(true)}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="w-4 h-4" />
              Crea il tuo primo libro
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="books-grid">
            {books.map((book, index) => (
              <Card 
                key={book.id}
                className={`book-card aspect-[2/3] bg-white border border-border/60 shadow-sm cursor-pointer group relative overflow-hidden rounded-sm animate-fadeInUp stagger-${(index % 5) + 1}`}
                onClick={() => openBook(book)}
                data-testid={`book-card-${book.id}`}
              >
                {/* Cover Image or Placeholder */}
                <div className="absolute inset-0">
                  {book.cover_image ? (
                    <img 
                      src={`data:image/png;base64,${book.cover_image}`}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-primary/20" strokeWidth={1} />
                    </div>
                  )}
                </div>
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-lg font-medium text-white truncate mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {book.title}
                  </h3>
                  {book.author && (
                    <p className="text-sm text-white/80 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {book.author}
                    </p>
                  )}
                </div>

                {/* Info Badge */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-white/90 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookToDelete(book);
                      setShowDeleteDialog(true);
                    }}
                    data-testid={`delete-book-${book.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                {/* Bottom Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-border group-hover:translate-y-full transition-transform duration-300">
                  <h3 className="text-base font-medium text-primary truncate mb-1">
                    {book.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(book.updated_at)}
                    <span className="mx-1">•</span>
                    <FileText className="w-3 h-3" />
                    {book.chapters?.length || 0} capitoli
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
            <DialogTitle className="text-2xl font-light">Nuovo Libro</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli del tuo nuovo libro. Puoi generare automaticamente la struttura con l'AI.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                placeholder="Il mio libro"
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                data-testid="input-title"
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

            <div className="space-y-2">
              <Label htmlFor="topic">Argomento (per generazione AI)</Label>
              <Textarea
                id="topic"
                placeholder="Es: Guida completa alla meditazione per principianti"
                value={newBook.topic}
                onChange={(e) => setNewBook({ ...newBook, topic: e.target.value })}
                rows={2}
                data-testid="input-topic"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Numero Capitoli</Label>
                <Select 
                  value={String(newBook.settings.chapter_count)}
                  onValueChange={(v) => setNewBook({
                    ...newBook,
                    settings: { ...newBook.settings, chapter_count: parseInt(v) }
                  })}
                >
                  <SelectTrigger data-testid="select-chapters">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10, 12, 15].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} capitoli</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Formato</Label>
                <Select 
                  value={newBook.settings.format}
                  onValueChange={(v) => setNewBook({
                    ...newBook,
                    settings: { ...newBook.settings, format: v }
                  })}
                >
                  <SelectTrigger data-testid="select-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5x8">5" x 8"</SelectItem>
                    <SelectItem value="6x9">6" x 9" (Standard)</SelectItem>
                    <SelectItem value="8.5x11">8.5" x 11"</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  <SelectItem value="color">A Colori</SelectItem>
                  <SelectItem value="bw">Bianco e Nero</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleCreateBook(false)}
              disabled={isGenerating}
              data-testid="create-manual-btn"
            >
              Crea Manuale
            </Button>
            <Button 
              onClick={() => handleCreateBook(true)}
              disabled={isGenerating || !newBook.topic.trim()}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="create-ai-btn"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generazione AI (può richiedere 30-60s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Genera con AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo libro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il libro "{bookToDelete?.title}" sarà eliminato permanentemente.
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
