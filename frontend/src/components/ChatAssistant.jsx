import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  X, 
  Loader2, 
  Sparkles,
  Plus,
  Bot,
  User,
  Check,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChatAssistant({ bookContext, onExercisesGenerated, onAddExercises }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ciao! Sono il tuo assistente AI. Posso aiutarti a creare esercizi, suggerire contenuti e rispondere alle tue domande. Cosa vorresti fare?',
      exercises: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingExercises, setPendingExercises] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, exercises: null }]);
    setIsLoading(true);
    setPendingExercises(null);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: userMessage,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        book_context: bookContext
      }, { timeout: 90000 });

      const assistantMessage = response.data.response;
      const exercises = response.data.exercises;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: assistantMessage,
        exercises: exercises
      }]);

      if (exercises && exercises.length > 0) {
        setPendingExercises(exercises);
        toast.success(`${exercises.length} esercizi generati! Clicca "Aggiungi al capitolo" per inserirli.`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Mi dispiace, si è verificato un errore. Riprova tra poco.',
        exercises: null
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExercises = (exercises) => {
    if (onAddExercises && exercises && exercises.length > 0) {
      onAddExercises(exercises);
      toast.success(`${exercises.length} esercizi aggiunti al capitolo!`);
      setPendingExercises(null);
    } else if (!onAddExercises) {
      toast.error('Apri un libro per aggiungere gli esercizi');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: 'Crea 5 esercizi di matematica facili', icon: Plus },
    { label: 'Genera sequenze numeriche per bambini', icon: Sparkles },
    { label: 'Crea esercizi trova l\'intruso', icon: Plus },
  ];

  const handleQuickAction = (action) => {
    setInput(action);
    inputRef.current?.focus();
  };

  const getExerciseTypeName = (type) => {
    const names = {
      'math': 'Matematica',
      'sequence': 'Sequenza',
      'match': 'Collega',
      'odd_one_out': 'Trova intruso',
      'copy': 'Copia',
      'memory': 'Memoria'
    };
    return names[type] || type;
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg bg-accent hover:bg-accent/90 z-50"
        data-testid="chat-toggle-btn"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div 
      className="fixed bottom-20 right-6 w-[420px] h-[550px] bg-white rounded-lg shadow-2xl border border-border flex flex-col z-50 overflow-hidden"
      data-testid="chat-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-accent/10 to-accent/5">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" />
          <span className="font-medium text-primary">Assistente AI</span>
          {bookContext && (
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
              {bookContext.title?.substring(0, 15)}...
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsOpen(false)}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className="space-y-2">
              <div 
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] p-3 rounded-lg text-sm ${
                    msg.role === 'user' 
                      ? 'bg-accent text-white rounded-br-none' 
                      : 'bg-secondary text-foreground rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
              
              {/* Show generated exercises */}
              {msg.exercises && msg.exercises.length > 0 && (
                <div className="ml-10 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      {msg.exercises.length} esercizi generati
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {msg.exercises.slice(0, 3).map((ex, j) => (
                      <div key={j} className="text-xs text-green-700 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {ex.title || getExerciseTypeName(ex.type)}
                      </div>
                    ))}
                    {msg.exercises.length > 3 && (
                      <div className="text-xs text-green-600">
                        + altri {msg.exercises.length - 3} esercizi
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddExercises(msg.exercises)}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!onAddExercises}
                    data-testid="add-exercises-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi al Capitolo
                  </Button>
                  {!onAddExercises && (
                    <p className="text-xs text-amber-600 mt-2 text-center">
                      Apri un libro per aggiungere gli esercizi
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="bg-secondary p-3 rounded-lg rounded-bl-none">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Sto pensando...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Azioni rapide:</p>
          <div className="flex flex-wrap gap-1">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickAction(action.label)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Es: Crea 5 esercizi di matematica..."
            disabled={isLoading}
            className="flex-1"
            data-testid="chat-input"
          />
          <Button 
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="bg-accent hover:bg-accent/90"
            data-testid="chat-send-btn"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
