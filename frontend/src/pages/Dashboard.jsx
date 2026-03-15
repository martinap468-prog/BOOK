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
  Loader2,
  Baby,
  School,
  Languages,
  Puzzle,
  Settings,
  ArrowRight,
  Check
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
import { bookApi, getThemes } from '../services/api';

const THEME_ICONS = {
  alzheimer: Brain,
  kids_preschool: Baby,
  kids_elementary: School,
  language_learning: Languages,
  puzzle_games: Puzzle,
  activity_book: Sparkles,
  custom: Settings
};

const THEME_COLORS = {
  alzheimer: 'from-blue-50 to-blue-100 border-blue-200',
  kids_preschool: 'from-pink-50 to-pink-100 border-pink-200',
  kids_elementary: 'from-green-50 to-green-100 border-green-200',
  language_learning: 'from-purple-50 to-purple-100 border-purple-200',
  puzzle_games: 'from-orange-50 to-orange-100 border-orange-200',
  activity_book: 'from-yellow-50 to-yellow-100 border-yellow-200',
  custom: 'from-gray-50 to-gray-100 border-gray-200'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { books, setBooks, addBook, removeBook, setCurrentBook, setLoading, isLoading } = useBookStore();
  const [showNewBookDialog, setShowNewBookDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [themes, setThemes] = useState({});
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [step, setStep] = useState(1); // 1 = select theme, 2 = book details
  
  const [newBook, setNewBook] = useState({
    title: '',
    subtitle: '',
    author: '',
    theme: 'custom',
    settings: { ...defaultSettings }
  });

  useEffect(() => {
    loadBooks();
    loadThemes();
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

  const loadThemes = async () => {
    try {
      const data = await getThemes();
      setThemes(data);
    } catch (error) {
      console.error('Error loading themes:', error);
    }
  };

  const handleSelectTheme = (themeKey) => {
    const theme = themes[themeKey];
    setSelectedTheme(themeKey);
    setNewBook({
      ...newBook,
      theme: themeKey,
      title: '',
      settings: {
        ...defaultSettings,
        ...theme.default_settings,
        theme: themeKey
      }
    });
    setStep(2);
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
      resetDialog();
      
      toast.success('Libro creato!');
      navigate(`/editor/${created.id}`);
    } catch (error) {
      console.error('Error creating book:', error);
      toast.error('Errore nella creazione');
    }
  };

  const resetDialog = () => {
    setShowNewBookDialog(false);
    setStep(1);
    setSelectedTheme(null);
    setNewBook({
      title: '',
      subtitle: '',
      author: '',
      theme: 'custom',
      settings: { ...defaultSettings }
    });
  };

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    
    try {
      await bookApi.delete(bookToDelete.id);
      removeBook(bookToDelete.id);
      toast.success('Libro eliminato');
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

  const getThemeInfo = (themeKey) => {
    return themes[themeKey] || themes['custom'] || { name: 'Personalizzato', icon: 'settings' };
  };

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard">
      {/* Header */}
      <header className="border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-accent" strokeWidth={1.5} />
            <div>
              <h1 className="text-2xl font-light tracking-tight text-primary">
                Book Creator
              </h1>
              <p className="text-xs text-muted-foreground">Crea libri ed esercizi personalizzati</p>
            </div>
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
            Crea libri per ogni esigenza
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Esercizi cognitivi, activity book per bambini, puzzle, apprendimento lingue e molto altro.
          </p>
        </section>

        {/* Books Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20" data-testid="empty-state">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-xl font-medium text-primary mb-2">Nessun libro ancora</h3>
            <p className="text-muted-foreground mb-6">
              Crea il tuo primo libro scegliendo un tema.
            </p>
            <Button 
              onClick={() => setShowNewBookDialog(true)}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Sparkles className="w-4 h-4" />
              Crea il primo libro
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="books-grid">
            {books.map((book, index) => {
              const themeInfo = getThemeInfo(book.theme);
              const ThemeIcon = THEME_ICONS[book.theme] || BookOpen;
              const themeColor = THEME_COLORS[book.theme] || THEME_COLORS['custom'];
              
              return (
                <Card 
                  key={book.id}
                  className={`book-card aspect-[3/4] bg-gradient-to-b ${themeColor} border shadow-sm cursor-pointer group relative overflow-hidden rounded-lg animate-fadeInUp hover:shadow-lg transition-all`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => openBook(book)}
                  data-testid={`book-card-${book.id}`}
                >
                  {/* Cover */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                    <ThemeIcon className="w-12 h-12 text-primary/30 mb-4" strokeWidth={1} />
                    <h3 className="text-lg font-medium text-primary text-center line-clamp-2 mb-2">
                      {book.title}
                    </h3>
                    {book.subtitle && (
                      <p className="text-sm text-muted-foreground text-center line-clamp-1">
                        {book.subtitle}
                      </p>
                    )}
                    <span className="mt-3 text-xs px-2 py-1 rounded-full bg-white/80 text-muted-foreground">
                      {themeInfo.name}
                    </span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6">
                    <p className="text-white text-center mb-4">
                      {book.chapters?.length || 0} capitoli<br />
                      {getTotalExercises(book)} esercizi
                    </p>
                    <Button variant="secondary" size="sm">
                      Apri Libro
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
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/80 border-t border-border/30">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(book.updated_at)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* New Book Dialog */}
      <Dialog open={showNewBookDialog} onOpenChange={(open) => { if (!open) resetDialog(); else setShowNewBookDialog(true); }}>
        <DialogContent className="sm:max-w-[700px]" data-testid="new-book-dialog">
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-light">Scegli il Tipo di Libro</DialogTitle>
                <DialogDescription>
                  Seleziona un tema e l'app si adatterà automaticamente con le impostazioni migliori.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-6">
                {Object.entries(themes).map(([key, theme]) => {
                  const Icon = THEME_ICONS[key] || Settings;
                  const colorClass = THEME_COLORS[key] || THEME_COLORS['custom'];
                  
                  return (
                    <Card
                      key={key}
                      className={`p-4 cursor-pointer hover:shadow-md transition-all border-2 ${
                        selectedTheme === key ? 'border-accent ring-2 ring-accent/20' : 'border-transparent'
                      } bg-gradient-to-b ${colorClass}`}
                      onClick={() => handleSelectTheme(key)}
                      data-testid={`theme-${key}`}
                    >
                      <div className="flex flex-col items-center text-center">
                        <Icon className="w-10 h-10 text-primary/70 mb-3" strokeWidth={1.5} />
                        <h4 className="font-medium text-primary text-sm mb-1">{theme.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{theme.description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-light flex items-center gap-2">
                  {(() => {
                    const Icon = THEME_ICONS[selectedTheme] || Settings;
                    return <Icon className="w-6 h-6" />;
                  })()}
                  {themes[selectedTheme]?.name || 'Nuovo Libro'}
                </DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli del tuo libro. Le impostazioni sono già ottimizzate per il tema scelto.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titolo *</Label>
                  <Input
                    id="title"
                    placeholder="Es: Il mio libro di esercizi"
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

                {/* Show current settings */}
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    Impostazioni ottimizzate per {themes[selectedTheme]?.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Dimensione font: {newBook.settings.font_size}pt</span>
                    <span>Colori: {newBook.settings.color_mode === 'color' ? 'A colori' : 'Bianco/nero'}</span>
                    <span>Difficoltà: {newBook.settings.difficulty === 'easy' ? 'Facile' : newBook.settings.difficulty === 'medium' ? 'Media' : 'Difficile'}</span>
                    <span>Formato: {newBook.settings.format}</span>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Indietro
                </Button>
                <Button 
                  onClick={handleCreateBook}
                  className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="create-book-btn"
                >
                  <Plus className="w-4 h-4" />
                  Crea Libro
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo libro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il libro "{bookToDelete?.title}" sarà eliminato.
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
