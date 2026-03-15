import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  BookOpen,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Image as ImageIcon,
  Type,
  Settings,
  ChevronRight,
  FileText,
  Download,
  Palette,
  GripVertical,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';
import { toast } from 'sonner';
import useBookStore from '../store/bookStore';
import { bookApi, generateApi } from '../services/api';

const FONT_OPTIONS = [
  { value: 'Crimson Pro', label: 'Crimson Pro (Elegante)' },
  { value: 'Georgia', label: 'Georgia (Classico)' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Palatino', label: 'Palatino' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Arial', label: 'Arial (Sans-serif)' },
  { value: 'Verdana', label: 'Verdana' },
];

export default function BookEditor() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const {
    currentBook,
    setCurrentBook,
    selectedChapterIndex,
    selectChapter,
    updateChapter,
    addChapter,
    removeChapter,
    updateSettings,
    isLoading,
    setLoading,
    isSaving,
    setSaving
  } = useBookStore();

  const [showDeleteChapterDialog, setShowDeleteChapterDialog] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('chapters');
  const [rightTab, setRightTab] = useState('style');

  useEffect(() => {
    if (bookId && !currentBook) {
      loadBook();
    }
  }, [bookId]);

  const loadBook = async () => {
    setLoading(true);
    try {
      const book = await bookApi.getOne(bookId);
      setCurrentBook(book);
    } catch (error) {
      console.error('Error loading book:', error);
      toast.error('Errore nel caricamento del libro');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const saveBook = useCallback(async () => {
    if (!currentBook) return;
    
    setSaving(true);
    try {
      await bookApi.update(currentBook.id, {
        title: currentBook.title,
        author: currentBook.author,
        topic: currentBook.topic,
        description: currentBook.description,
        cover_image: currentBook.cover_image,
        chapters: currentBook.chapters,
        settings: currentBook.settings
      });
      toast.success('Salvato!');
    } catch (error) {
      console.error('Error saving book:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  }, [currentBook, setSaving]);

  // Auto-save debounced
  useEffect(() => {
    if (!currentBook) return;
    const timer = setTimeout(() => {
      saveBook();
    }, 3000);
    return () => clearTimeout(timer);
  }, [currentBook?.chapters, currentBook?.settings]);

  const handleAddChapter = () => {
    addChapter({ title: `Capitolo ${(currentBook?.chapters?.length || 0) + 1}` });
    selectChapter((currentBook?.chapters?.length || 0));
    toast.success('Capitolo aggiunto');
  };

  const handleDeleteChapter = () => {
    if (chapterToDelete !== null) {
      removeChapter(chapterToDelete);
      setShowDeleteChapterDialog(false);
      setChapterToDelete(null);
      toast.success('Capitolo eliminato');
    }
  };

  const handleGenerateContent = async () => {
    const chapter = currentBook?.chapters?.[selectedChapterIndex];
    if (!chapter || !currentBook?.topic) {
      toast.error('Inserisci un argomento per il libro');
      return;
    }

    setIsGeneratingContent(true);
    try {
      const response = await generateApi.content(
        currentBook.topic,
        chapter.title,
        500
      );
      updateChapter(selectedChapterIndex, { content: response.content });
      toast.success('Contenuto generato!');
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Errore nella generazione del contenuto');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleGenerateImage = async () => {
    const chapter = currentBook?.chapters?.[selectedChapterIndex];
    if (!chapter) return;

    setIsGeneratingImage(true);
    try {
      const prompt = `Illustration for a book chapter titled "${chapter.title}" about ${currentBook?.topic || 'the topic'}`;
      const response = await generateApi.image(prompt);
      
      const images = [...(chapter.images || []), response.image_base64];
      updateChapter(selectedChapterIndex, { images });
      toast.success('Immagine generata!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Errore nella generazione dell\'immagine');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const removeImage = (imageIndex) => {
    const chapter = currentBook?.chapters?.[selectedChapterIndex];
    if (!chapter) return;
    
    const images = chapter.images.filter((_, i) => i !== imageIndex);
    updateChapter(selectedChapterIndex, { images });
    toast.success('Immagine rimossa');
  };

  const currentChapter = currentBook?.chapters?.[selectedChapterIndex];
  const settings = currentBook?.settings || {};

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
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background" data-testid="book-editor">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-border bg-white/50 backdrop-blur-sm hidden md:flex flex-col z-10">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="gap-2 mb-3 -ml-2"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
            <Input
              value={currentBook.title}
              onChange={(e) => setCurrentBook({ ...currentBook, title: e.target.value })}
              className="font-medium text-primary border-none bg-transparent p-0 h-auto text-lg focus-visible:ring-0"
              placeholder="Titolo del libro"
              data-testid="book-title-input"
            />
          </div>

          {/* Tabs */}
          <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 p-1 m-2 mr-3">
              <TabsTrigger value="chapters" className="text-xs">Capitoli</TabsTrigger>
              <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="chapters" className="flex-1 flex flex-col m-0 mt-0">
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {currentBook.chapters?.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className={`chapter-item flex items-center gap-2 p-3 rounded-sm cursor-pointer mb-1 ${
                        index === selectedChapterIndex ? 'active' : ''
                      }`}
                      onClick={() => selectChapter(index)}
                      data-testid={`chapter-${index}`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {chapter.title || `Capitolo ${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chapter.content?.length || 0} caratteri
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChapterToDelete(index);
                          setShowDeleteChapterDialog(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border">
                <Button 
                  onClick={handleAddChapter}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid="add-chapter-btn"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi Capitolo
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="info" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Autore</Label>
                    <Input
                      value={currentBook.author || ''}
                      onChange={(e) => setCurrentBook({ ...currentBook, author: e.target.value })}
                      placeholder="Nome autore"
                      data-testid="author-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Argomento</Label>
                    <Textarea
                      value={currentBook.topic || ''}
                      onChange={(e) => setCurrentBook({ ...currentBook, topic: e.target.value })}
                      placeholder="Argomento del libro"
                      rows={3}
                      data-testid="topic-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Textarea
                      value={currentBook.description || ''}
                      onChange={(e) => setCurrentBook({ ...currentBook, description: e.target.value })}
                      placeholder="Descrizione del libro"
                      rows={4}
                    />
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 relative flex flex-col items-center">
          {/* Toolbar */}
          <div className="w-full max-w-3xl flex items-center justify-between mb-6 no-print">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateContent}
                    disabled={isGeneratingContent}
                    className="gap-2"
                    data-testid="generate-content-btn"
                  >
                    {isGeneratingContent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Genera Testo
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Genera contenuto AI per questo capitolo</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                    className="gap-2"
                    data-testid="generate-image-btn"
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    Genera Immagine
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Genera illustrazione AI</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveBook}
                disabled={isSaving}
                className="gap-2"
                data-testid="save-btn"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salva
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/cover/${currentBook.id}`)}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="cover-btn"
              >
                <Palette className="w-4 h-4" />
                Copertina
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/preview/${currentBook.id}`)}
                className="gap-2"
                data-testid="preview-btn"
              >
                <FileText className="w-4 h-4" />
                Anteprima PDF
              </Button>
            </div>
          </div>

          {/* Paper Sheet */}
          {currentChapter ? (
            <div 
              className="paper-sheet w-full max-w-3xl min-h-[800px] bg-white shadow-sm border border-border/40 p-8 md:p-12 mx-auto transition-all rounded-sm"
              style={{
                fontFamily: settings.font_family || 'Crimson Pro',
                fontSize: `${settings.font_size || 12}pt`,
                lineHeight: settings.line_height || 1.6
              }}
            >
              {/* Chapter Title */}
              <Input
                value={currentChapter.title || ''}
                onChange={(e) => updateChapter(selectedChapterIndex, { title: e.target.value })}
                className="text-2xl md:text-3xl font-serif font-medium text-primary border-none bg-transparent p-0 h-auto mb-8 focus-visible:ring-0"
                placeholder="Titolo del capitolo"
                style={{ fontFamily: 'Fraunces, serif' }}
                data-testid="chapter-title-input"
              />

              {/* Chapter Content */}
              <Textarea
                value={currentChapter.content || ''}
                onChange={(e) => updateChapter(selectedChapterIndex, { content: e.target.value })}
                className="editor-textarea w-full min-h-[500px] border-none bg-transparent p-0 resize-none focus-visible:ring-0"
                placeholder="Inizia a scrivere il contenuto del capitolo..."
                style={{
                  fontFamily: settings.font_family || 'Crimson Pro',
                  fontSize: `${settings.font_size || 12}pt`,
                  lineHeight: settings.line_height || 1.6
                }}
                data-testid="chapter-content-textarea"
              />

              {/* Chapter Images */}
              {currentChapter.images?.length > 0 && (
                <div className="mt-8 border-t border-border pt-8">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                    Immagini del capitolo
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {currentChapter.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={`data:image/png;base64,${img}`}
                          alt={`Illustrazione ${i + 1}`}
                          className="w-full h-48 object-cover rounded-sm border border-border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-3xl min-h-[400px] bg-white/50 border border-dashed border-border rounded-sm flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nessun capitolo selezionato</p>
                <Button
                  onClick={handleAddChapter}
                  variant="outline"
                  className="mt-4 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Aggiungi il primo capitolo
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Style Options */}
        <aside className="w-72 border-l border-border bg-white/50 backdrop-blur-sm hidden lg:flex flex-col z-10">
          <Tabs value={rightTab} onValueChange={setRightTab} className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="style" className="text-xs gap-1">
                  <Type className="w-3 h-3" />
                  Stile
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs gap-1">
                  <Settings className="w-3 h-3" />
                  Formato
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="style" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  {/* Font Family */}
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Font
                    </Label>
                    <Select
                      value={settings.font_family || 'Crimson Pro'}
                      onValueChange={(v) => updateSettings({ font_family: v })}
                    >
                      <SelectTrigger data-testid="font-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Font Size */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Dimensione Testo
                      </Label>
                      <span className="text-sm font-medium">{settings.font_size || 12}pt</span>
                    </div>
                    <Slider
                      value={[settings.font_size || 12]}
                      onValueChange={([v]) => updateSettings({ font_size: v })}
                      min={10}
                      max={18}
                      step={1}
                      data-testid="font-size-slider"
                    />
                  </div>

                  <Separator />

                  {/* Line Height */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Interlinea
                      </Label>
                      <span className="text-sm font-medium">{settings.line_height || 1.6}</span>
                    </div>
                    <Slider
                      value={[settings.line_height * 10 || 16]}
                      onValueChange={([v]) => updateSettings({ line_height: v / 10 })}
                      min={12}
                      max={24}
                      step={1}
                      data-testid="line-height-slider"
                    />
                  </div>

                  <Separator />

                  {/* Color Mode */}
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Modalità Colore
                    </Label>
                    <Select
                      value={settings.color_mode || 'color'}
                      onValueChange={(v) => updateSettings({ color_mode: v })}
                    >
                      <SelectTrigger data-testid="color-mode-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="color">A Colori</SelectItem>
                        <SelectItem value="bw">Bianco e Nero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 m-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-6">
                  {/* Book Format */}
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Formato Libro
                    </Label>
                    <Select
                      value={settings.format || '6x9'}
                      onValueChange={(v) => updateSettings({ format: v })}
                    >
                      <SelectTrigger data-testid="format-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5x8">5" x 8" (Tascabile)</SelectItem>
                        <SelectItem value="6x9">6" x 9" (Standard)</SelectItem>
                        <SelectItem value="8.5x11">8.5" x 11" (Grande)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Formato compatibile con Amazon KDP
                    </p>
                  </div>

                  <Separator />

                  {/* Page Count Info */}
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Statistiche
                    </Label>
                    <div className="bg-secondary/50 rounded-sm p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Capitoli</span>
                        <span className="font-medium">{currentBook.chapters?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Caratteri totali</span>
                        <span className="font-medium">
                          {currentBook.chapters?.reduce((acc, ch) => acc + (ch.content?.length || 0), 0).toLocaleString('it-IT')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Parole stimate</span>
                        <span className="font-medium">
                          {Math.round(currentBook.chapters?.reduce((acc, ch) => acc + (ch.content?.split(/\s+/).length || 0), 0)).toLocaleString('it-IT')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        {/* Delete Chapter Dialog */}
        <AlertDialog open={showDeleteChapterDialog} onOpenChange={setShowDeleteChapterDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare questo capitolo?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. Il capitolo e tutto il suo contenuto saranno eliminati.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteChapter}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
