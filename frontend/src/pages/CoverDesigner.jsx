import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Sparkles,
  Upload,
  Trash2,
  Loader2,
  BookOpen,
  Type,
  Palette
} from 'lucide-react';
import { Button } from '../components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import useBookStore from '../store/bookStore';
import { bookApi, generateApi } from '../services/api';

const COVER_STYLES = [
  { value: 'modern', label: 'Moderno Minimalista' },
  { value: 'classic', label: 'Classico Elegante' },
  { value: 'artistic', label: 'Artistico Creativo' },
  { value: 'photo', label: 'Fotografico' },
];

const FORMAT_SIZES = {
  '5x8': { width: 5, height: 8, label: '5" x 8"' },
  '6x9': { width: 6, height: 9, label: '6" x 9"' },
  '8.5x11': { width: 8.5, height: 11, label: '8.5" x 11"' },
};

export default function CoverDesigner() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { currentBook, setCurrentBook, setCoverImage, setLoading, isLoading } = useBookStore();
  
  const [coverStyle, setCoverStyle] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [coverTitle, setCoverTitle] = useState('');
  const [coverAuthor, setCoverAuthor] = useState('');
  const [titleColor, setTitleColor] = useState('#FFFFFF');
  const [authorColor, setAuthorColor] = useState('#CCCCCC');
  const [titleSize, setTitleSize] = useState(32);
  const [authorSize, setAuthorSize] = useState(18);

  useEffect(() => {
    if (bookId && !currentBook) {
      loadBook();
    } else if (currentBook) {
      setCoverTitle(currentBook.title || '');
      setCoverAuthor(currentBook.author || '');
    }
  }, [bookId, currentBook]);

  const loadBook = async () => {
    setLoading(true);
    try {
      const book = await bookApi.getOne(bookId);
      setCurrentBook(book);
      setCoverTitle(book.title || '');
      setCoverAuthor(book.author || '');
    } catch (error) {
      console.error('Error loading book:', error);
      toast.error('Errore nel caricamento del libro');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!currentBook?.topic && !customPrompt) {
      toast.error('Inserisci un argomento o una descrizione personalizzata');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await generateApi.cover(
        coverTitle || currentBook?.title || 'Libro',
        coverAuthor || currentBook?.author || 'Autore',
        customPrompt || currentBook?.topic || '',
        coverStyle
      );
      
      setCoverImage(response.image_base64);
      
      // Save to backend
      await bookApi.update(currentBook.id, { cover_image: response.image_base64 });
      
      toast.success('Copertina generata!');
    } catch (error) {
      console.error('Error generating cover:', error);
      toast.error('Errore nella generazione della copertina');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadCover = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      setCoverImage(base64);
      
      try {
        await bookApi.update(currentBook.id, { cover_image: base64 });
        toast.success('Copertina caricata!');
      } catch (error) {
        console.error('Error saving cover:', error);
        toast.error('Errore nel salvataggio');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = async () => {
    setCoverImage(null);
    try {
      await bookApi.update(currentBook.id, { cover_image: null });
      toast.success('Copertina rimossa');
    } catch (error) {
      console.error('Error removing cover:', error);
    }
  };

  const format = FORMAT_SIZES[currentBook?.settings?.format || '6x9'];
  const aspectRatio = format.height / format.width;

  if (isLoading || !currentBook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="cover-designer">
      {/* Header */}
      <header className="border-b border-border bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/editor/${currentBook.id}`)}
              className="gap-2"
              data-testid="back-to-editor-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Editor
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-light tracking-tight text-primary">
              Designer Copertina
            </h1>
          </div>
          <Button
            onClick={() => navigate(`/preview/${currentBook.id}`)}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="preview-pdf-btn"
          >
            Anteprima PDF
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Cover Preview */}
          <div className="flex flex-col items-center">
            <div 
              className="relative bg-white border border-border shadow-lg rounded-sm overflow-hidden"
              style={{ 
                width: '100%', 
                maxWidth: '400px',
                aspectRatio: `${format.width}/${format.height}`
              }}
            >
              {currentBook.cover_image ? (
                <>
                  <img
                    src={`data:image/png;base64,${currentBook.cover_image}`}
                    alt="Copertina"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay with title/author */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <h2 
                      className="font-serif font-bold drop-shadow-lg mb-2"
                      style={{ 
                        color: titleColor, 
                        fontSize: `${titleSize}px`,
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {coverTitle}
                    </h2>
                    <p 
                      className="drop-shadow-lg"
                      style={{ 
                        color: authorColor, 
                        fontSize: `${authorSize}px`,
                        textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
                      }}
                    >
                      {coverAuthor}
                    </p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted p-8">
                  <BookOpen className="w-16 h-16 text-primary/20 mb-4" strokeWidth={1} />
                  <p className="text-muted-foreground text-center">
                    Genera o carica una copertina
                  </p>
                </div>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              Formato: {format.label} (Amazon KDP)
            </p>

            {currentBook.cover_image && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveCover}
                className="mt-4 gap-2 text-destructive hover:text-destructive"
                data-testid="remove-cover-btn"
              >
                <Trash2 className="w-4 h-4" />
                Rimuovi Copertina
              </Button>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-8">
            <Tabs defaultValue="generate" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generate" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Genera con AI
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Carica Immagine
                </TabsTrigger>
              </TabsList>

              <TabsContent value="generate" className="space-y-6 mt-6">
                {/* Style Selection */}
                <div className="space-y-3">
                  <Label>Stile Copertina</Label>
                  <Select value={coverStyle} onValueChange={setCoverStyle}>
                    <SelectTrigger data-testid="cover-style-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COVER_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Prompt */}
                <div className="space-y-3">
                  <Label>Descrizione Personalizzata (opzionale)</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Descrivi come vuoi che sia la copertina..."
                    rows={3}
                    data-testid="custom-prompt-textarea"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lascia vuoto per usare l'argomento del libro
                  </p>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateCover}
                  disabled={isGenerating}
                  className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                  data-testid="generate-cover-btn"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Genera Copertina
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="upload" className="space-y-6 mt-6">
                <div className="border-2 border-dashed border-border rounded-sm p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCover}
                    className="hidden"
                    id="cover-upload"
                    data-testid="cover-upload-input"
                  />
                  <label htmlFor="cover-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-2">
                      Clicca per caricare un'immagine
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG fino a 10MB
                    </p>
                  </label>
                </div>
              </TabsContent>
            </Tabs>

            {/* Text Overlay Settings */}
            <div className="border border-border rounded-sm p-6 space-y-6 bg-white/50">
              <h3 className="font-medium text-primary flex items-center gap-2">
                <Type className="w-4 h-4" />
                Testo sulla Copertina
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titolo</Label>
                  <Input
                    value={coverTitle}
                    onChange={(e) => setCoverTitle(e.target.value)}
                    placeholder="Titolo del libro"
                    data-testid="cover-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Autore</Label>
                  <Input
                    value={coverAuthor}
                    onChange={(e) => setCoverAuthor(e.target.value)}
                    placeholder="Nome autore"
                    data-testid="cover-author-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Colore Titolo</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={titleColor}
                      onChange={(e) => setTitleColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={titleColor}
                      onChange={(e) => setTitleColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Colore Autore</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={authorColor}
                      onChange={(e) => setAuthorColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={authorColor}
                      onChange={(e) => setAuthorColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dimensione Titolo: {titleSize}px</Label>
                  <Input
                    type="range"
                    min="16"
                    max="64"
                    value={titleSize}
                    onChange={(e) => setTitleSize(parseInt(e.target.value))}
                    className="cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dimensione Autore: {authorSize}px</Label>
                  <Input
                    type="range"
                    min="12"
                    max="36"
                    value={authorSize}
                    onChange={(e) => setAuthorSize(parseInt(e.target.value))}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
