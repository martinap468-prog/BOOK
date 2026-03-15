import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Brain
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import useBookStore from '../store/bookStore';
import { bookApi } from '../services/api';
import ExerciseRenderer from '../components/ExerciseRenderer';

const FORMAT_SIZES = {
  '5x8': { width: 5, height: 8, label: '5" x 8"' },
  '6x9': { width: 6, height: 9, label: '6" x 9"' },
  '8.5x11': { width: 8.5, height: 11, label: '8.5" x 11"' },
};

export default function PDFPreview() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { currentBook, setCurrentBook, setLoading, isLoading } = useBookStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

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
      toast.error('Errore nel caricamento');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Build pages for preview
  const buildPreviewPages = () => {
    if (!currentBook) return [];
    
    const pages = [];
    
    // Title page
    pages.push({ 
      type: 'title', 
      title: currentBook.title,
      subtitle: currentBook.subtitle,
      author: currentBook.author
    });
    
    // Exercise pages (1 per page)
    for (const chapter of currentBook.chapters || []) {
      // Chapter title page
      pages.push({
        type: 'chapter_title',
        title: chapter.title,
        description: chapter.description,
        exerciseCount: chapter.exercises?.length || 0
      });
      
      // Each exercise on its own page
      for (const exercise of chapter.exercises || []) {
        pages.push({
          type: 'exercise',
          exercise
        });
      }
    }
    
    return pages;
  };

  const generatePDF = async () => {
    if (!currentBook) return;

    setIsGeneratingPDF(true);
    toast.info('Generazione PDF in corso...');

    try {
      const format = FORMAT_SIZES[currentBook.settings?.format || '8.5x11'];
      const settings = currentBook.settings || {};
      const fontSize = settings.font_size || 18;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [format.width, format.height]
      });

      const pageWidth = format.width;
      const pageHeight = format.height;
      const margin = 0.75;
      const contentWidth = pageWidth - (margin * 2);

      // Title Page
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(currentBook.title || 'Quaderno di Esercizi', contentWidth);
      let y = pageHeight * 0.35;
      titleLines.forEach((line, i) => {
        const w = pdf.getTextWidth(line);
        pdf.text(line, (pageWidth - w) / 2, y + i * 0.4);
      });

      if (currentBook.subtitle) {
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'normal');
        y += titleLines.length * 0.4 + 0.3;
        const w = pdf.getTextWidth(currentBook.subtitle);
        pdf.text(currentBook.subtitle, (pageWidth - w) / 2, y);
      }

      if (currentBook.author) {
        pdf.setFontSize(14);
        y += 0.5;
        const w = pdf.getTextWidth(currentBook.author);
        pdf.text(currentBook.author, (pageWidth - w) / 2, y);
      }

      // Generate pages for each chapter and exercise
      for (const chapter of currentBook.chapters || []) {
        // Chapter title page
        pdf.addPage();
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        const chapterTitleLines = pdf.splitTextToSize(chapter.title, contentWidth);
        y = pageHeight * 0.4;
        chapterTitleLines.forEach((line, i) => {
          const w = pdf.getTextWidth(line);
          pdf.text(line, (pageWidth - w) / 2, y + i * 0.35);
        });

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        y += chapterTitleLines.length * 0.35 + 0.3;
        const countText = `${chapter.exercises?.length || 0} esercizi`;
        const w = pdf.getTextWidth(countText);
        pdf.text(countText, (pageWidth - w) / 2, y);

        // Each exercise
        for (let i = 0; i < (chapter.exercises?.length || 0); i++) {
          const exercise = chapter.exercises[i];
          pdf.addPage();

          // Exercise header
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', 'bold');
          pdf.text(exercise.title || 'Esercizio', margin, margin + 0.3);

          pdf.setFontSize(fontSize - 4);
          pdf.setFont('helvetica', 'normal');
          const instructionLines = pdf.splitTextToSize(exercise.instruction || '', contentWidth);
          y = margin + 0.7;
          instructionLines.forEach((line, idx) => {
            pdf.text(line, margin, y + idx * 0.25);
          });
          y += instructionLines.length * 0.25 + 0.5;

          // Exercise content based on type
          pdf.setFontSize(fontSize);
          
          if (exercise.type === 'sequence') {
            const sequence = exercise.content?.sequence || [];
            const boxSize = 0.8;
            const startX = (pageWidth - sequence.length * (boxSize + 0.2)) / 2;
            
            sequence.forEach((item, idx) => {
              const x = startX + idx * (boxSize + 0.2);
              pdf.rect(x, y, boxSize, boxSize);
              pdf.setFont('helvetica', item === '?' ? 'bold' : 'normal');
              const textW = pdf.getTextWidth(String(item));
              pdf.text(String(item), x + (boxSize - textW) / 2, y + boxSize * 0.65);
            });
            
            y += boxSize + 0.8;
            pdf.setFontSize(fontSize - 2);
            pdf.text('La risposta è: _______', margin, y);
          }
          
          else if (exercise.type === 'math') {
            const { operand1, operator, operand2 } = exercise.content || {};
            pdf.setFontSize(fontSize + 8);
            pdf.setFont('helvetica', 'bold');
            const mathText = `${operand1} ${operator} ${operand2} = ?`;
            const mathW = pdf.getTextWidth(mathText);
            pdf.text(mathText, (pageWidth - mathW) / 2, y + 0.5);
            
            y += 1.5;
            pdf.setFontSize(fontSize - 2);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Risposta: _______', margin, y);
          }
          
          else if (exercise.type === 'odd_one_out') {
            const items = exercise.content?.items || [];
            const boxWidth = 1.5;
            const boxHeight = 0.6;
            const cols = 2;
            
            items.forEach((item, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const x = margin + col * (boxWidth + 0.5);
              const itemY = y + row * (boxHeight + 0.3);
              
              pdf.rect(x, itemY, boxWidth, boxHeight);
              pdf.setFontSize(fontSize - 2);
              const textW = pdf.getTextWidth(item);
              pdf.text(item, x + (boxWidth - textW) / 2, itemY + boxHeight * 0.65);
            });
            
            y += Math.ceil(items.length / cols) * (boxHeight + 0.3) + 0.5;
            pdf.setFontSize(fontSize - 2);
            pdf.text('Cerchia l\'intruso!', margin, y);
          }
          
          else if (exercise.type === 'copy') {
            const text = exercise.content?.text || '';
            pdf.setFontSize(fontSize + 4);
            pdf.setFont('helvetica', 'bold');
            const textW = pdf.getTextWidth(text);
            pdf.text(text, (pageWidth - textW) / 2, y + 0.5);
            
            y += 1.2;
            pdf.setFontSize(fontSize - 2);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Riscrivi qui sotto:', margin, y);
            
            // Lines for writing
            for (let line = 0; line < 3; line++) {
              y += 0.6;
              pdf.setDrawColor(180);
              pdf.setLineDashPattern([0.05, 0.05], 0);
              pdf.line(margin, y, pageWidth - margin, y);
            }
            pdf.setLineDashPattern([], 0);
            pdf.setDrawColor(0);
          }
          
          else if (exercise.type === 'match') {
            const words = exercise.content?.words || [];
            const definitions = exercise.content?.definitions || [];
            
            pdf.setFontSize(fontSize - 2);
            
            // Words column
            words.forEach((word, idx) => {
              pdf.text(`${idx + 1}. ${word}`, margin, y + idx * 0.4);
            });
            
            // Definitions column
            definitions.forEach((def, idx) => {
              pdf.text(`${String.fromCharCode(65 + idx)}. ${def}`, pageWidth / 2, y + idx * 0.4);
            });
            
            y += Math.max(words.length, definitions.length) * 0.4 + 0.5;
            pdf.text('Collega (es: 1-A, 2-B):', margin, y);
            y += 0.4;
            words.forEach((_, idx) => {
              pdf.text(`${idx + 1} → ___`, margin + (idx % 3) * 1.5, y + Math.floor(idx / 3) * 0.4);
            });
          }
          
          else if (exercise.type === 'memory') {
            const cards = exercise.content?.cards || [];
            const cardSize = 0.6;
            const cols = 4;
            const startX = (pageWidth - cols * (cardSize + 0.15)) / 2;
            
            cards.forEach((symbol, idx) => {
              const col = idx % cols;
              const row = Math.floor(idx / cols);
              const x = startX + col * (cardSize + 0.15);
              const cardY = y + row * (cardSize + 0.15);
              
              pdf.rect(x, cardY, cardSize, cardSize);
              pdf.setFontSize(fontSize);
              const textW = pdf.getTextWidth(symbol);
              pdf.text(symbol, x + (cardSize - textW) / 2, cardY + cardSize * 0.7);
            });
          }

          // Page number
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          const pageNum = `${i + 1}`;
          const pageNumW = pdf.getTextWidth(pageNum);
          pdf.text(pageNum, (pageWidth - pageNumW) / 2, pageHeight - 0.5);
        }
      }

      // Save PDF
      const fileName = `${currentBook.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'quaderno'}.pdf`;
      pdf.save(fileName);
      toast.success('PDF scaricato!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Errore nella generazione del PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const previewPages = buildPreviewPages();
  const format = FORMAT_SIZES[currentBook?.settings?.format || '8.5x11'];

  if (isLoading || !currentBook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const currentPageData = previewPages[currentPage];

  return (
    <div className="min-h-screen bg-background" data-testid="pdf-preview">
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
              Anteprima PDF
            </h1>
          </div>
          <Button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            data-testid="download-pdf-btn"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Scarica PDF
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {currentPage + 1} di {previewPages.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(Math.min(previewPages.length - 1, currentPage + 1))}
            disabled={currentPage >= previewPages.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Page Preview */}
        <div className="flex justify-center">
          <div 
            className="bg-white border border-border shadow-lg overflow-hidden"
            style={{ 
              width: '100%',
              maxWidth: '600px',
              aspectRatio: `${format.width}/${format.height}`
            }}
          >
            <ScrollArea className="h-full">
              <div className="p-8 md:p-12" style={{ fontSize: `${currentBook.settings?.font_size || 18}pt` }}>
                {/* Title Page */}
                {currentPageData?.type === 'title' && (
                  <div className="h-full flex flex-col items-center justify-center text-center min-h-[400px]">
                    <Brain className="w-16 h-16 text-primary/30 mb-6" />
                    <h1 className="text-3xl font-bold text-primary mb-2">
                      {currentPageData.title}
                    </h1>
                    {currentPageData.subtitle && (
                      <p className="text-xl text-muted-foreground mb-4">
                        {currentPageData.subtitle}
                      </p>
                    )}
                    {currentPageData.author && (
                      <p className="text-lg text-muted-foreground">
                        {currentPageData.author}
                      </p>
                    )}
                  </div>
                )}

                {/* Chapter Title Page */}
                {currentPageData?.type === 'chapter_title' && (
                  <div className="h-full flex flex-col items-center justify-center text-center min-h-[400px]">
                    <h2 className="text-2xl font-bold text-primary mb-4">
                      {currentPageData.title}
                    </h2>
                    {currentPageData.description && (
                      <p className="text-lg text-muted-foreground mb-4">
                        {currentPageData.description}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {currentPageData.exerciseCount} esercizi
                    </p>
                  </div>
                )}

                {/* Exercise Page */}
                {currentPageData?.type === 'exercise' && (
                  <ExerciseRenderer 
                    exercise={currentPageData.exercise}
                    colorMode={currentBook.settings?.color_mode || 'bw'}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Page Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Formato: {format.label} • {currentBook.chapters?.length || 0} capitoli • 
            {currentBook.chapters?.reduce((acc, ch) => acc + (ch.exercises?.length || 0), 0) || 0} esercizi totali
          </p>
        </div>
      </main>
    </div>
  );
}
