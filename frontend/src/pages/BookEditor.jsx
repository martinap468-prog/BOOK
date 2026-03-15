import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Settings,
  FileText,
  Download,
  Loader2,
  Brain,
  ChevronRight,
  ChevronDown,
  Calculator,
  ListOrdered,
  Link,
  Route,
  Eye,
  Pencil,
  Palette,
  CircleOff,
  Search,
  GitBranch,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../components/ui/collapsible';
import { toast } from 'sonner';
import useBookStore from '../store/bookStore';
import { bookApi, generateApi, getExerciseTypes } from '../services/api';
import ExerciseRenderer from '../components/ExerciseRenderer';
import ChatAssistant from '../components/ChatAssistant';

const EXERCISE_ICONS = {
  sequence: ListOrdered,
  math: Calculator,
  match: Link,
  maze: Route,
  recognition: Eye,
  memory: Brain,
  copy: Pencil,
  coloring: Palette,
  odd_one_out: CircleOff,
  differences: Search,
  connect_dots: GitBranch
};

export default function BookEditor() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const {
    currentBook,
    setCurrentBook,
    selectedChapterIndex,
    selectedExerciseIndex,
    selectChapter,
    selectExercise,
    addChapter,
    updateChapter,
    removeChapter,
    addExercises,
    removeExercise,
    updateSettings,
    isLoading,
    setLoading,
    isSaving,
    setSaving
  } = useBookStore();

  const [exerciseTypes, setExerciseTypes] = useState({});
  const [showAddChapterDialog, setShowAddChapterDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDeleteChapterDialog, setShowDeleteChapterDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [imagePrompt, setImagePrompt] = useState('');
  const fileInputRef = useRef(null);

  const [newChapter, setNewChapter] = useState({
    title: '',
    exercise_type: 'sequence',
    exercise_count: 5,
    difficulty: 'medium'
  });

  useEffect(() => {
    loadExerciseTypes();
    if (bookId && !currentBook) {
      loadBook();
    }
  }, [bookId]);

  const loadExerciseTypes = async () => {
    try {
      const types = await getExerciseTypes();
      setExerciseTypes(types);
    } catch (error) {
      console.error('Error loading exercise types:', error);
    }
  };

  const loadBook = async () => {
    setLoading(true);
    try {
      const book = await bookApi.getOne(bookId);
      setCurrentBook(book);
    } catch (error) {
      console.error('Error loading book:', error);
      toast.error('Errore nel caricamento');
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
        subtitle: currentBook.subtitle,
        author: currentBook.author,
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

  const handleAddChapter = async () => {
    if (!newChapter.title.trim()) {
      toast.error('Inserisci un titolo per il capitolo');
      return;
    }

    // Check if this is an image-based exercise type
    const imageTypes = ['maze', 'coloring', 'differences', 'connect_dots'];
    const hasImages = imageTypes.includes(newChapter.exercise_type);
    
    if (hasImages) {
      toast.info(`Generazione in corso... Gli esercizi con immagini richiedono 30-60 secondi ciascuno.`, {
        duration: 10000
      });
    }

    setIsGenerating(true);
    try {
      // Generate chapter with exercises
      const chapter = await generateApi.chapter(
        newChapter.title,
        newChapter.exercise_type,
        newChapter.difficulty,
        newChapter.exercise_count,
        currentBook?.settings?.color_mode || 'bw'
      );
      
      addChapter(chapter);
      
      // Save to backend immediately
      const updatedChapters = [...(currentBook?.chapters || []), chapter];
      await bookApi.update(currentBook.id, { chapters: updatedChapters });
      
      setShowAddChapterDialog(false);
      setNewChapter({
        title: '',
        exercise_type: 'sequence',
        exercise_count: 5,
        difficulty: 'medium'
      });
      toast.success(`Capitolo creato con ${chapter.exercises.length} esercizi!`);
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast.error('Errore nella creazione del capitolo');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMoreExercises = async () => {
    const chapter = currentBook?.chapters?.[selectedChapterIndex];
    if (!chapter) return;

    setIsGenerating(true);
    try {
      const result = await generateApi.exercise(
        chapter.exercise_type || 'sequence',
        currentBook?.settings?.difficulty || 'medium',
        5,
        currentBook?.settings?.color_mode || 'bw'
      );
      
      if (result.exercises) {
        addExercises(selectedChapterIndex, result.exercises);
        
        // Save to backend
        const updatedChapters = [...currentBook.chapters];
        updatedChapters[selectedChapterIndex].exercises = [
          ...updatedChapters[selectedChapterIndex].exercises,
          ...result.exercises
        ];
        await bookApi.update(currentBook.id, { chapters: updatedChapters });
        
        toast.success(`Aggiunti ${result.exercises.length} esercizi!`);
      }
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast.error('Errore nella generazione');
    } finally {
      setIsGenerating(false);
      setShowGenerateDialog(false);
    }
  };

  const handleDeleteChapter = () => {
    if (chapterToDelete !== null) {
      removeChapter(chapterToDelete);
      setShowDeleteChapterDialog(false);
      setChapterToDelete(null);
      toast.success('Capitolo eliminato');
    }
  };

  const handleDeleteExercise = (exerciseIndex) => {
    removeExercise(selectedChapterIndex, exerciseIndex);
    toast.success('Esercizio eliminato');
  };

  // Image handling functions
  const handleUploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      await addImageToExercise(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Inserisci una descrizione per l\'immagine');
      return;
    }

    setIsGeneratingImage(true);
    toast.info('Generazione immagine in corso (30-60 secondi)...');
    
    try {
      const response = await generateApi.customImage(
        imagePrompt,
        currentBook?.settings?.color_mode || 'bw'
      );
      
      if (response.image_base64) {
        await addImageToExercise(response.image_base64);
        setImagePrompt('');
        setShowImageDialog(false);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Errore nella generazione dell\'immagine');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const addImageToExercise = async (imageBase64) => {
    if (!currentBook || selectedChapterIndex === undefined || selectedExerciseIndex === undefined) return;

    const chapters = [...currentBook.chapters];
    const exercise = chapters[selectedChapterIndex].exercises[selectedExerciseIndex];
    
    // Add image to exercise's images array
    const images = exercise.images || [];
    images.push(imageBase64);
    exercise.images = images;
    
    // Update local state
    setCurrentBook({ ...currentBook, chapters });
    
    // Save to backend
    try {
      await bookApi.update(currentBook.id, { chapters });
      toast.success('Immagine aggiunta!');
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Errore nel salvataggio');
    }
  };

  const removeImageFromExercise = async (imageIndex) => {
    if (!currentBook || selectedChapterIndex === undefined || selectedExerciseIndex === undefined) return;

    const chapters = [...currentBook.chapters];
    const exercise = chapters[selectedChapterIndex].exercises[selectedExerciseIndex];
    
    exercise.images = exercise.images.filter((_, i) => i !== imageIndex);
    
    setCurrentBook({ ...currentBook, chapters });
    
    try {
      await bookApi.update(currentBook.id, { chapters });
      toast.success('Immagine rimossa');
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  // Handle exercises from chat
  const handleAddExercisesFromChat = async (exercises) => {
    if (!currentBook || selectedChapterIndex === undefined || selectedChapterIndex < 0) {
      // If no chapter selected, create one first
      if (currentBook && (!currentBook.chapters || currentBook.chapters.length === 0)) {
        toast.error('Crea prima un capitolo per aggiungere gli esercizi');
        return;
      }
    }

    const chapterIndex = selectedChapterIndex >= 0 ? selectedChapterIndex : 0;
    
    try {
      // Add exercises to current chapter
      addExercises(chapterIndex, exercises);
      
      // Save to backend
      const updatedChapters = [...currentBook.chapters];
      updatedChapters[chapterIndex].exercises = [
        ...updatedChapters[chapterIndex].exercises,
        ...exercises
      ];
      await bookApi.update(currentBook.id, { chapters: updatedChapters });
      
      // Select the first new exercise
      selectExercise(updatedChapters[chapterIndex].exercises.length - exercises.length);
      
    } catch (error) {
      console.error('Error adding exercises from chat:', error);
      toast.error('Errore nell\'aggiunta degli esercizi');
    }
  };

  const toggleChapter = (index) => {
    setExpandedChapters(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const currentChapter = currentBook?.chapters?.[selectedChapterIndex];
  const currentExercise = currentChapter?.exercises?.[selectedExerciseIndex];

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
    <div className="flex h-screen overflow-hidden bg-background" data-testid="book-editor">
      {/* Left Sidebar - Chapters & Exercises */}
      <aside className="w-80 border-r border-border bg-white/50 backdrop-blur-sm flex flex-col z-10">
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
            placeholder="Titolo quaderno"
            data-testid="book-title-input"
          />
        </div>

        {/* Chapters List */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            {currentBook.chapters?.map((chapter, chapterIndex) => {
              const Icon = EXERCISE_ICONS[chapter.exercise_type] || Brain;
              const isExpanded = expandedChapters[chapterIndex];
              
              return (
                <Collapsible 
                  key={chapter.id}
                  open={isExpanded}
                  onOpenChange={() => toggleChapter(chapterIndex)}
                  className="mb-2"
                >
                  <div 
                    className={`rounded-lg border ${selectedChapterIndex === chapterIndex ? 'border-accent bg-accent/5' : 'border-border bg-white'}`}
                  >
                    <CollapsibleTrigger asChild>
                      <div 
                        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-secondary/50"
                        onClick={() => selectChapter(chapterIndex)}
                        data-testid={`chapter-${chapterIndex}`}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary truncate">
                            {chapter.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {chapter.exercises?.length || 0} esercizi
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChapterToDelete(chapterIndex);
                            setShowDeleteChapterDialog(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-1 space-y-1">
                        {chapter.exercises?.map((exercise, exIndex) => (
                          <div
                            key={exercise.id}
                            className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer ${
                              selectedChapterIndex === chapterIndex && selectedExerciseIndex === exIndex 
                                ? 'bg-accent/20' 
                                : 'hover:bg-secondary/50'
                            }`}
                            onClick={() => {
                              selectChapter(chapterIndex);
                              selectExercise(exIndex);
                            }}
                            data-testid={`exercise-${chapterIndex}-${exIndex}`}
                          >
                            <span className="text-xs text-muted-foreground w-6">{exIndex + 1}.</span>
                            <span className="flex-1 truncate">{exercise.title}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExercise(exIndex);
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-xs gap-1"
                          onClick={() => {
                            selectChapter(chapterIndex);
                            setShowGenerateDialog(true);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          Aggiungi Esercizi
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        {/* Add Chapter Button */}
        <div className="p-3 border-t border-border">
          <Button 
            onClick={() => setShowAddChapterDialog(true)}
            className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="add-chapter-btn"
          >
            <Plus className="w-4 h-4" />
            Nuovo Capitolo
          </Button>
        </div>
      </aside>

      {/* Main Content - Exercise Preview */}
      <main className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
        {/* Toolbar */}
        <div className="w-full max-w-4xl flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentChapter ? `${currentChapter.title} - Esercizio ${selectedExerciseIndex + 1}/${currentChapter.exercises?.length || 0}` : 'Nessun capitolo selezionato'}
            </span>
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
              onClick={() => navigate(`/preview/${currentBook.id}`)}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="preview-btn"
            >
              <FileText className="w-4 h-4" />
              Anteprima PDF
            </Button>
          </div>
        </div>

        {/* Exercise Display */}
        {currentExercise ? (
          <div className="w-full max-w-4xl">
            {/* Image Controls */}
            <div className="flex items-center justify-end gap-2 mb-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                data-testid="upload-image-btn"
              >
                <Upload className="w-4 h-4" />
                Carica Immagine
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImageDialog(true)}
                className="gap-2"
                data-testid="generate-image-btn"
              >
                <Sparkles className="w-4 h-4" />
                Genera Immagine AI
              </Button>
            </div>

            {/* Exercise Content */}
            <div 
              className="bg-white border border-border rounded-lg shadow-sm p-8 md:p-12"
              style={{ fontSize: `${currentBook.settings?.font_size || 18}pt` }}
            >
              <ExerciseRenderer 
                exercise={currentExercise} 
                colorMode={currentBook.settings?.color_mode || 'bw'}
              />
              
              {/* User Added Images */}
              {currentExercise.images && currentExercise.images.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                    Immagini Aggiunte
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {currentExercise.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={`data:image/png;base64,${img}`}
                          alt={`Immagine ${i + 1}`}
                          className="w-full h-48 object-contain rounded-lg border border-border bg-secondary/20"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImageFromExercise(i)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : currentChapter ? (
          <div className="w-full max-w-4xl bg-white/50 border border-dashed border-border rounded-lg p-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nessun esercizio in questo capitolo</p>
            <Button
              onClick={() => setShowGenerateDialog(true)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Genera Esercizi
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-4xl bg-white/50 border border-dashed border-border rounded-lg p-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Crea il primo capitolo per iniziare</p>
            <Button
              onClick={() => setShowAddChapterDialog(true)}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="w-4 h-4" />
              Nuovo Capitolo
            </Button>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentChapter && currentChapter.exercises?.length > 1 && (
          <div className="flex items-center gap-4 mt-6">
            <Button
              variant="outline"
              disabled={selectedExerciseIndex === 0}
              onClick={() => selectExercise(selectedExerciseIndex - 1)}
            >
              ← Precedente
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedExerciseIndex + 1} / {currentChapter.exercises.length}
            </span>
            <Button
              variant="outline"
              disabled={selectedExerciseIndex >= currentChapter.exercises.length - 1}
              onClick={() => selectExercise(selectedExerciseIndex + 1)}
            >
              Successivo →
            </Button>
          </div>
        )}
      </main>

      {/* Add Chapter Dialog */}
      <Dialog open={showAddChapterDialog} onOpenChange={setShowAddChapterDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="add-chapter-dialog">
          <DialogHeader>
            <DialogTitle>Nuovo Capitolo</DialogTitle>
            <DialogDescription>
              Crea un capitolo con esercizi generati automaticamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titolo Capitolo *</Label>
              <Input
                placeholder="Es: Esercizi di Memoria"
                value={newChapter.title}
                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                data-testid="chapter-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo di Esercizi</Label>
              <Select 
                value={newChapter.exercise_type}
                onValueChange={(v) => setNewChapter({ ...newChapter, exercise_type: v })}
              >
                <SelectTrigger data-testid="exercise-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(exerciseTypes).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      {type.name} {type.has_image && '🎨'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {['maze', 'coloring', 'differences', 'connect_dots'].includes(newChapter.exercise_type) && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Esercizi con immagini AI: ogni immagine richiede 30-60 secondi di generazione
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficoltà</Label>
                <Select 
                  value={newChapter.difficulty}
                  onValueChange={(v) => setNewChapter({ ...newChapter, difficulty: v })}
                >
                  <SelectTrigger>
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
                <Label>Numero Esercizi</Label>
                <Select 
                  value={String(newChapter.exercise_count)}
                  onValueChange={(v) => setNewChapter({ ...newChapter, exercise_count: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 esercizi</SelectItem>
                    <SelectItem value="5">5 esercizi</SelectItem>
                    <SelectItem value="10">10 esercizi</SelectItem>
                    <SelectItem value="15">15 esercizi</SelectItem>
                    <SelectItem value="20">20 esercizi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleAddChapter}
              disabled={isGenerating}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crea e Genera
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate More Exercises Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Genera Altri Esercizi</DialogTitle>
            <DialogDescription>
              Aggiungi altri esercizi a "{currentChapter?.title}"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleGenerateMoreExercises}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Genera 5 Esercizi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Dialog */}
      <AlertDialog open={showDeleteChapterDialog} onOpenChange={setShowDeleteChapterDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo capitolo?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno eliminati anche tutti gli esercizi contenuti.
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

      {/* Generate Image Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[500px]" data-testid="generate-image-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Genera Immagine con AI
            </DialogTitle>
            <DialogDescription>
              Descrivi l'immagine che vuoi generare. Sarà creata in stile semplice e chiaro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="imagePrompt">Descrizione Immagine</Label>
              <Input
                id="imagePrompt"
                placeholder="Es: un gatto, una casa, frutta sul tavolo, un albero..."
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                data-testid="image-prompt-input"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              L'immagine sarà generata in stile {currentBook?.settings?.color_mode === 'color' ? 'a colori semplici' : 'bianco e nero'}, adatto per la stampa.
            </p>
            <p className="text-xs text-amber-600">
              ⚠️ La generazione richiede 30-60 secondi
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImageDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !imagePrompt.trim()}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="confirm-generate-image-btn"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Genera Immagine
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Assistant with book context */}
      <ChatAssistant 
        bookContext={currentBook ? {
          id: currentBook.id,
          title: currentBook.title,
          theme: currentBook.theme,
          currentChapter: currentChapter?.title
        } : null}
        onAddExercises={currentChapter ? handleAddExercisesFromChat : null}
      />
    </div>
  );
}
