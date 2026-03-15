import React from 'react';

// Exercise Renderer Component - Renders different exercise types
export default function ExerciseRenderer({ exercise, colorMode = 'bw' }) {
  const { type, title, instruction, content, difficulty } = exercise;

  const getDifficultyLabel = (diff) => {
    switch (diff) {
      case 'easy': return 'Facile';
      case 'medium': return 'Medio';
      case 'hard': return 'Difficile';
      default: return diff;
    }
  };

  // Common header for all exercises
  const ExerciseHeader = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
        <span className="text-sm px-3 py-1 rounded-full bg-secondary text-muted-foreground">
          {getDifficultyLabel(difficulty)}
        </span>
      </div>
      <p className="text-lg text-muted-foreground">{instruction}</p>
    </div>
  );

  // Sequence Exercise
  if (type === 'sequence') {
    return (
      <div className="exercise-sequence" data-testid="exercise-sequence">
        <ExerciseHeader />
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {content.sequence?.map((item, index) => (
            <div
              key={index}
              className={`w-20 h-20 flex items-center justify-center text-3xl font-bold rounded-lg border-2 ${
                item === '?' 
                  ? 'border-accent bg-accent/10 text-accent' 
                  : 'border-border bg-white'
              }`}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <p className="text-lg mb-2">La risposta è:</p>
          <div className="w-24 h-16 mx-auto border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">___</span>
          </div>
        </div>
      </div>
    );
  }

  // Math Exercise
  if (type === 'math') {
    return (
      <div className="exercise-math" data-testid="exercise-math">
        <ExerciseHeader />
        <div className="text-center py-8">
          <div className="text-5xl font-bold text-primary mb-8">
            {content.operand1} {content.operator} {content.operand2} = ?
          </div>
          <div className="w-32 h-20 mx-auto border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center">
            <span className="text-2xl text-muted-foreground">___</span>
          </div>
        </div>
      </div>
    );
  }

  // Match Exercise
  if (type === 'match') {
    return (
      <div className="exercise-match" data-testid="exercise-match">
        <ExerciseHeader />
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-center mb-4">Parole</h3>
            {content.words?.map((word, index) => (
              <div
                key={index}
                className="p-4 border-2 border-border rounded-lg text-center font-medium bg-white"
              >
                {index + 1}. {word}
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-center mb-4">Definizioni</h3>
            {content.definitions?.map((def, index) => (
              <div
                key={index}
                className="p-4 border-2 border-dashed border-muted-foreground rounded-lg text-center"
              >
                {String.fromCharCode(65 + index)}. {def}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 p-4 bg-secondary/50 rounded-lg">
          <p className="font-medium mb-2">Collega (es: 1-A, 2-C...):</p>
          <div className="grid grid-cols-3 gap-2">
            {content.words?.map((_, index) => (
              <div key={index} className="border-b-2 border-muted-foreground py-2 text-center">
                {index + 1} → ___
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Odd One Out Exercise
  if (type === 'odd_one_out') {
    return (
      <div className="exercise-odd-one-out" data-testid="exercise-odd-one-out">
        <ExerciseHeader />
        <div className="flex flex-wrap justify-center gap-6 py-8">
          {content.items?.map((item, index) => (
            <div
              key={index}
              className="w-40 h-24 flex items-center justify-center text-xl font-medium border-2 border-border rounded-lg bg-white hover:border-accent transition-colors cursor-pointer"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="text-center mt-4">
          <p className="text-lg">Cerchia l'intruso!</p>
        </div>
      </div>
    );
  }

  // Copy Exercise
  if (type === 'copy') {
    return (
      <div className="exercise-copy" data-testid="exercise-copy">
        <ExerciseHeader />
        <div className="py-8">
          <div className="text-center mb-8">
            <p className="text-3xl font-bold text-primary tracking-wider">
              {content.text}
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-lg">Riscrivi qui sotto:</p>
            {[1, 2, 3].map((line) => (
              <div
                key={line}
                className="h-16 border-b-2 border-dashed border-muted-foreground"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Recognition Exercise
  if (type === 'recognition') {
    return (
      <div className="exercise-recognition" data-testid="exercise-recognition">
        <ExerciseHeader />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-8">
          {content.objects?.map((obj, index) => (
            <div key={index} className="text-center">
              <div className="w-full h-32 border-2 border-border rounded-lg bg-secondary/30 flex items-center justify-center mb-3">
                <span className="text-4xl">
                  {getObjectEmoji(obj.name)}
                </span>
              </div>
              {content.show_hints && (
                <p className="text-sm text-muted-foreground mb-2">{obj.hint}</p>
              )}
              <div className="border-b-2 border-dashed border-muted-foreground py-2">
                Nome: _______________
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Memory Exercise
  if (type === 'memory') {
    return (
      <div className="exercise-memory" data-testid="exercise-memory">
        <ExerciseHeader />
        <div className="py-8">
          <p className="text-center mb-6">Trova le {content.pairs_count} coppie di simboli uguali:</p>
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
            {content.cards?.map((symbol, index) => (
              <div
                key={index}
                className="aspect-square flex items-center justify-center text-3xl border-2 border-border rounded-lg bg-white hover:bg-secondary/50 cursor-pointer"
              >
                {symbol}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default/Unknown type
  return (
    <div className="exercise-default" data-testid="exercise-default">
      <ExerciseHeader />
      <div className="text-center py-8 text-muted-foreground">
        <p>Tipo di esercizio: {type}</p>
        <pre className="mt-4 text-left text-sm bg-secondary/50 p-4 rounded-lg overflow-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    </div>
  );
}

// Helper function for recognition exercise icons
function getObjectEmoji(name) {
  const emojis = {
    'OROLOGIO': '🕐',
    'TELEFONO': '📱',
    'CHIAVI': '🔑',
    'OCCHIALI': '👓',
    'PETTINE': '🪮',
    'TAZZA': '☕',
    'FORBICI': '✂️',
    'OMBRELLO': '☂️'
  };
  return emojis[name] || '❓';
}
