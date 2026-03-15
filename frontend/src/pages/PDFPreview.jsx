import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Download,
  Loader2,
  FileText,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useBookStore from '../store/bookStore';
import { bookApi } from '../services/api';

const FORMAT_SIZES = {
  '5x8': { width: 5, height: 8, label: '5" x 8"', pxWidth: 360, pxHeight: 576 },
  '6x9': { width: 6, height: 9, label: '6" x 9"', pxWidth: 432, pxHeight: 648 },
  '8.5x11': { width: 8.5, height: 11, label: '8.5" x 11"', pxWidth: 612, pxHeight: 792 },
};

export default function PDFPreview() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const { currentBook, setCurrentBook, setLoading, isLoading } = useBookStore();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const previewRef = useRef(null);

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

  const generatePDF = async () => {
    if (!currentBook) return;

    setIsGeneratingPDF(true);
    toast.info('Generazione PDF in corso...');

    try {
      const format = FORMAT_SIZES[currentBook.settings?.format || '6x9'];
      const settings = currentBook.settings || {};
      
      // Create PDF with correct dimensions (in inches, converted to points)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [format.width, format.height]
      });

      const pageWidth = format.width;
      const pageHeight = format.height;
      const margin = 0.75; // 0.75 inch margins
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);

      // Font settings
      const fontFamily = settings.font_family || 'helvetica';
      const fontSize = settings.font_size || 12;
      const lineHeight = settings.line_height || 1.6;

      // Add cover page if exists
      if (currentBook.cover_image) {
        try {
          const coverImg = new Image();
          coverImg.src = `data:image/png;base64,${currentBook.cover_image}`;
          await new Promise((resolve) => {
            coverImg.onload = resolve;
          });
          pdf.addImage(coverImg, 'PNG', 0, 0, pageWidth, pageHeight);
          pdf.addPage();
        } catch (e) {
          console.error('Error adding cover:', e);
        }
      }

      // Title page
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(currentBook.title || 'Senza Titolo', contentWidth);
      const titleY = pageHeight * 0.4;
      titleLines.forEach((line, i) => {
        const textWidth = pdf.getTextWidth(line);
        pdf.text(line, (pageWidth - textWidth) / 2, titleY + (i * 0.4));
      });

      if (currentBook.author) {
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'normal');
        const authorWidth = pdf.getTextWidth(currentBook.author);
        pdf.text(currentBook.author, (pageWidth - authorWidth) / 2, titleY + (titleLines.length * 0.4) + 0.5);
      }

      // Add chapters
      for (const chapter of currentBook.chapters || []) {
        pdf.addPage();
        
        // Chapter title
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        const chapterTitleLines = pdf.splitTextToSize(chapter.title || 'Capitolo', contentWidth);
        let yPosition = margin + 0.5;
        chapterTitleLines.forEach((line) => {
          pdf.text(line, margin, yPosition);
          yPosition += 0.35;
        });
        
        yPosition += 0.3;

        // Chapter content
        if (chapter.content) {
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', 'normal');
          
          const paragraphs = chapter.content.split('\n\n');
          
          for (const paragraph of paragraphs) {
            const lines = pdf.splitTextToSize(paragraph.trim(), contentWidth);
            
            for (const line of lines) {
              if (yPosition > pageHeight - margin) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.text(line, margin, yPosition);
              yPosition += (fontSize / 72) * lineHeight;
            }
            
            yPosition += (fontSize / 72) * 0.5; // Paragraph spacing
          }
        }

        // Add chapter images
        if (chapter.images?.length > 0) {
          for (const imgBase64 of chapter.images) {
            if (yPosition > pageHeight - margin - 3) {
              pdf.addPage();
              yPosition = margin;
            }

            try {
              const img = new Image();
              img.src = `data:image/png;base64,${imgBase64}`;
              await new Promise((resolve) => {
                img.onload = resolve;
              });
              
              const imgWidth = contentWidth * 0.8;
              const imgHeight = imgWidth * (img.height / img.width);
              const imgX = (pageWidth - imgWidth) / 2;
              
              pdf.addImage(img, 'PNG', imgX, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 0.5;
            } catch (e) {
              console.error('Error adding image:', e);
            }
          }
        }
      }

      // Save PDF
      const fileName = `${currentBook.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'libro'}.pdf`;
      pdf.save(fileName);
      toast.success('PDF scaricato!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Errore nella generazione del PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Build pages for preview
  const buildPreviewPages = () => {
    if (!currentBook) return [];
    
    const pages = [];
    
    // Cover page
    if (currentBook.cover_image) {
      pages.push({ type: 'cover', image: currentBook.cover_image });
    }
    
    // Title page
    pages.push({ 
      type: 'title', 
      title: currentBook.title,
      author: currentBook.author
    });
    
    // Chapter pages
    for (const chapter of currentBook.chapters || []) {
      pages.push({
        type: 'chapter',
        title: chapter.title,
        content: chapter.content,
        images: chapter.images
      });
    }
    
    return pages;
  };

  const previewPages = buildPreviewPages();
  const format = FORMAT_SIZES[currentBook?.settings?.format || '6x9'];
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
            data-testid="prev-page-btn"
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
            disabled={currentPage === previewPages.length - 1}
            data-testid="next-page-btn"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Page Preview */}
        <div className="flex justify-center">
          <div 
            ref={previewRef}
            className="bg-white border border-border shadow-lg overflow-hidden"
            style={{ 
              width: '100%',
              maxWidth: '500px',
              aspectRatio: `${format.width}/${format.height}`
            }}
          >
            {previewPages[currentPage]?.type === 'cover' && (
              <div className="w-full h-full">
                <img
                  src={`data:image/png;base64,${previewPages[currentPage].image}`}
                  alt="Copertina"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {previewPages[currentPage]?.type === 'title' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <h1 
                  className="text-3xl md:text-4xl font-serif font-bold text-primary mb-4"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  {previewPages[currentPage].title}
                </h1>
                {previewPages[currentPage].author && (
                  <p className="text-lg text-muted-foreground">
                    {previewPages[currentPage].author}
                  </p>
                )}
              </div>
            )}

            {previewPages[currentPage]?.type === 'chapter' && (
              <ScrollArea className="h-full">
                <div className="p-8 md:p-12">
                  <h2 
                    className="text-2xl font-serif font-bold text-primary mb-6"
                    style={{ fontFamily: 'Fraunces, serif' }}
                  >
                    {previewPages[currentPage].title}
                  </h2>
                  <div 
                    className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-wrap"
                    style={{
                      fontFamily: settings.font_family || 'Crimson Pro',
                      fontSize: `${settings.font_size || 12}pt`,
                      lineHeight: settings.line_height || 1.6
                    }}
                  >
                    {previewPages[currentPage].content || 'Nessun contenuto'}
                  </div>
                  
                  {previewPages[currentPage].images?.length > 0 && (
                    <div className="mt-8 space-y-4">
                      {previewPages[currentPage].images.map((img, i) => (
                        <img
                          key={i}
                          src={`data:image/png;base64,${img}`}
                          alt={`Illustrazione ${i + 1}`}
                          className="w-full max-w-sm mx-auto rounded border border-border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Page Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Formato: {format.label} • {currentBook.chapters?.length || 0} capitoli • 
            {settings.color_mode === 'bw' ? ' Bianco e Nero' : ' A Colori'}
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 text-center">
            Navigazione Rapida
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {previewPages.map((page, index) => (
              <Button
                key={index}
                variant={index === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(index)}
                className="text-xs"
              >
                {page.type === 'cover' && 'Copertina'}
                {page.type === 'title' && 'Titolo'}
                {page.type === 'chapter' && (page.title?.substring(0, 15) || `Cap. ${index}`)}
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
