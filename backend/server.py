from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class Exercise(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "differences", "sequence", "match", "maze", "math", "recognition", "memory", "copy", "coloring"
    title: str = ""
    instruction: str = ""
    difficulty: str = "medium"  # "easy", "medium", "hard"
    content: Dict[str, Any] = {}  # Exercise-specific data
    image_base64: Optional[str] = None
    solution: Optional[Dict[str, Any]] = None

class Chapter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    description: str = ""
    exercise_type: str = "mixed"
    exercises: List[Exercise] = []
    order: int = 0

class BookSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    format: str = "8.5x11"  # Large format for readability
    color_mode: str = "bw"  # "bw" or "color"
    font_size: int = 18  # Large font
    exercises_per_page: int = 1
    difficulty: str = "medium"
    include_solutions: bool = True
    theme: str = "custom"  # Theme preset

class Book(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Nuovo Libro"
    subtitle: str = ""
    author: str = ""
    theme: str = "custom"  # Theme/category
    cover_image: Optional[str] = None
    chapters: List[Chapter] = []
    settings: BookSettings = Field(default_factory=BookSettings)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BookCreate(BaseModel):
    title: str = "Nuovo Libro"
    subtitle: str = ""
    author: str = ""
    theme: str = "custom"
    settings: Optional[BookSettings] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    author: Optional[str] = None
    cover_image: Optional[str] = None
    chapters: Optional[List[Chapter]] = None
    settings: Optional[BookSettings] = None

class GenerateExerciseRequest(BaseModel):
    exercise_type: str
    difficulty: str = "medium"
    topic: Optional[str] = None
    quantity: int = 1
    color_mode: str = "bw"

class GenerateChapterRequest(BaseModel):
    chapter_title: str
    exercise_type: str
    difficulty: str = "medium"
    exercise_count: int = 5
    color_mode: str = "bw"

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    book_context: Optional[Dict[str, Any]] = None  # Current book info for context

# Exercise type definitions
EXERCISE_TYPES = {
    "sequence": {
        "name": "Completa la Sequenza",
        "description": "Completa la sequenza di numeri, lettere o figure",
        "icon": "list-ordered",
        "has_image": False
    },
    "math": {
        "name": "Calcoli",
        "description": "Operazioni matematiche semplici",
        "icon": "calculator",
        "has_image": False
    },
    "match": {
        "name": "Collega",
        "description": "Collega parole e immagini corrispondenti",
        "icon": "link",
        "has_image": False
    },
    "odd_one_out": {
        "name": "Trova l'Intruso",
        "description": "Trova l'elemento diverso dagli altri",
        "icon": "circle-off",
        "has_image": False
    },
    "copy": {
        "name": "Copia e Scrivi",
        "description": "Ricalca o copia parole e frasi",
        "icon": "pencil",
        "has_image": False
    },
    "recognition": {
        "name": "Riconoscimento",
        "description": "Riconosci e nomina gli oggetti",
        "icon": "eye",
        "has_image": False
    },
    "memory": {
        "name": "Memoria",
        "description": "Esercizi di memoria visiva",
        "icon": "brain",
        "has_image": False
    },
    "maze": {
        "name": "Labirinto",
        "description": "Trova la strada nel labirinto",
        "icon": "route",
        "has_image": True
    },
    "differences": {
        "name": "Trova le Differenze",
        "description": "Trova le differenze tra due immagini simili",
        "icon": "search",
        "has_image": True
    },
    "coloring": {
        "name": "Colora",
        "description": "Colora le figure",
        "icon": "palette",
        "has_image": True
    },
    "connect_dots": {
        "name": "Unisci i Puntini",
        "description": "Completa il disegno unendo i puntini numerati",
        "icon": "git-branch",
        "has_image": True
    }
}

# Book themes/templates
BOOK_THEMES = {
    "alzheimer": {
        "name": "Stimolazione Cognitiva",
        "description": "Esercizi per persone con Alzheimer o demenza",
        "icon": "brain",
        "default_settings": {
            "font_size": 20,
            "color_mode": "bw",
            "difficulty": "easy",
            "format": "8.5x11"
        },
        "recommended_exercises": ["sequence", "math", "match", "odd_one_out", "copy", "memory", "coloring"],
        "style": "simple, clear, large text, high contrast"
    },
    "kids_preschool": {
        "name": "Bambini Prescolare (3-5 anni)",
        "description": "Attività divertenti per i più piccoli",
        "icon": "baby",
        "default_settings": {
            "font_size": 24,
            "color_mode": "color",
            "difficulty": "easy",
            "format": "8.5x11"
        },
        "recommended_exercises": ["coloring", "maze", "connect_dots", "match", "differences"],
        "style": "colorful, fun, cartoon-style, very simple"
    },
    "kids_elementary": {
        "name": "Bambini Elementari (6-10 anni)",
        "description": "Esercizi educativi per la scuola primaria",
        "icon": "school",
        "default_settings": {
            "font_size": 16,
            "color_mode": "bw",
            "difficulty": "medium",
            "format": "8.5x11"
        },
        "recommended_exercises": ["math", "sequence", "copy", "odd_one_out", "maze", "differences"],
        "style": "educational, clear, age-appropriate illustrations"
    },
    "language_learning": {
        "name": "Apprendimento Lingue",
        "description": "Esercizi per imparare nuove lingue",
        "icon": "languages",
        "default_settings": {
            "font_size": 16,
            "color_mode": "bw",
            "difficulty": "medium",
            "format": "6x9"
        },
        "recommended_exercises": ["match", "copy", "recognition", "odd_one_out"],
        "style": "clean, educational, vocabulary-focused"
    },
    "puzzle_games": {
        "name": "Puzzle e Giochi",
        "description": "Rompicapo e giochi di logica",
        "icon": "puzzle",
        "default_settings": {
            "font_size": 14,
            "color_mode": "bw",
            "difficulty": "medium",
            "format": "6x9"
        },
        "recommended_exercises": ["maze", "differences", "sequence", "memory", "connect_dots"],
        "style": "puzzle-style, challenging, brain-teaser"
    },
    "activity_book": {
        "name": "Activity Book",
        "description": "Libro di attività miste",
        "icon": "sparkles",
        "default_settings": {
            "font_size": 16,
            "color_mode": "color",
            "difficulty": "medium",
            "format": "8.5x11"
        },
        "recommended_exercises": ["coloring", "maze", "connect_dots", "differences", "match", "copy"],
        "style": "varied, fun, engaging activities"
    },
    "custom": {
        "name": "Personalizzato",
        "description": "Crea il tuo libro con impostazioni personalizzate",
        "icon": "settings",
        "default_settings": {
            "font_size": 16,
            "color_mode": "bw",
            "difficulty": "medium",
            "format": "6x9"
        },
        "recommended_exercises": ["sequence", "math", "match", "maze", "coloring", "copy", "memory", "differences", "connect_dots", "odd_one_out", "recognition"],
        "style": "user-defined"
    }
}

# ============== BOOK ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "Book Creator API - Crea libri ed esercizi personalizzati"}

@api_router.get("/themes")
async def get_themes():
    """Get available book themes/templates"""
    return BOOK_THEMES

@api_router.get("/exercise-types")
async def get_exercise_types():
    return EXERCISE_TYPES

@api_router.post("/books", response_model=Book)
async def create_book(book_data: BookCreate):
    settings = book_data.settings or BookSettings()
    book = Book(
        title=book_data.title,
        subtitle=book_data.subtitle,
        author=book_data.author,
        settings=settings,
        chapters=[]
    )
    doc = book.model_dump()
    await db.books.insert_one(doc)
    return book

@api_router.get("/books", response_model=List[Book])
async def get_books():
    books = await db.books.find({}, {"_id": 0}).to_list(100)
    return books

@api_router.get("/books/{book_id}", response_model=Book)
async def get_book(book_id: str):
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    return book

@api_router.put("/books/{book_id}", response_model=Book)
async def update_book(book_id: str, update_data: BookUpdate):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_dict:
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        if "settings" in update_dict and update_dict["settings"]:
            update_dict["settings"] = update_dict["settings"] if isinstance(update_dict["settings"], dict) else update_dict["settings"].model_dump()
        if "chapters" in update_dict and update_dict["chapters"]:
            update_dict["chapters"] = [c if isinstance(c, dict) else c.model_dump() for c in update_dict["chapters"]]
        await db.books.update_one({"id": book_id}, {"$set": update_dict})
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    return book

@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str):
    result = await db.books.delete_one({"id": book_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    return {"message": "Libro eliminato"}

# ============== EXERCISE GENERATION ==============

def generate_sequence_exercise(difficulty: str) -> Dict:
    """Generate a sequence completion exercise"""
    if difficulty == "easy":
        # Simple number sequences
        start = random.randint(1, 5)
        step = 1
        sequence = [start + i * step for i in range(5)]
        hidden_idx = random.randint(2, 4)
    elif difficulty == "medium":
        start = random.randint(1, 10)
        step = random.choice([2, 5, 10])
        sequence = [start + i * step for i in range(5)]
        hidden_idx = random.randint(1, 3)
    else:
        start = random.randint(1, 20)
        step = random.choice([3, 4, 7])
        sequence = [start + i * step for i in range(6)]
        hidden_idx = random.randint(1, 4)
    
    answer = sequence[hidden_idx]
    sequence[hidden_idx] = "?"
    
    return {
        "sequence": sequence,
        "answer": answer,
        "type": "numbers"
    }

def generate_math_exercise(difficulty: str) -> Dict:
    """Generate a simple math exercise"""
    if difficulty == "easy":
        a = random.randint(1, 10)
        b = random.randint(1, 10)
        op = "+"
        result = a + b
    elif difficulty == "medium":
        op = random.choice(["+", "-"])
        if op == "+":
            a = random.randint(5, 20)
            b = random.randint(1, 15)
            result = a + b
        else:
            a = random.randint(10, 30)
            b = random.randint(1, a)
            result = a - b
    else:
        op = random.choice(["+", "-", "×"])
        if op == "+":
            a = random.randint(10, 50)
            b = random.randint(10, 50)
            result = a + b
        elif op == "-":
            a = random.randint(20, 100)
            b = random.randint(1, a)
            result = a - b
        else:
            a = random.randint(2, 10)
            b = random.randint(2, 10)
            result = a * b
    
    return {
        "operand1": a,
        "operand2": b,
        "operator": op,
        "answer": result
    }

def generate_match_exercise(difficulty: str) -> Dict:
    """Generate a matching exercise"""
    word_pairs = [
        ("MELA", "frutta rossa"),
        ("CANE", "animale domestico"),
        ("SOLE", "stella nel cielo"),
        ("CASA", "dove abitiamo"),
        ("LIBRO", "da leggere"),
        ("PANE", "da mangiare"),
        ("ACQUA", "da bere"),
        ("FIORE", "nel giardino"),
        ("ALBERO", "ha le foglie"),
        ("GATTO", "fa miao"),
        ("UCCELLO", "vola nel cielo"),
        ("PESCE", "nuota nell'acqua"),
    ]
    
    count = 3 if difficulty == "easy" else (4 if difficulty == "medium" else 5)
    selected = random.sample(word_pairs, count)
    
    words = [p[0] for p in selected]
    definitions = [p[1] for p in selected]
    random.shuffle(definitions)
    
    return {
        "words": words,
        "definitions": definitions,
        "answers": {p[0]: p[1] for p in selected}
    }

def generate_odd_one_out_exercise(difficulty: str) -> Dict:
    """Generate find the odd one out exercise"""
    categories = [
        {"items": ["MELA", "PERA", "BANANA", "SEDIA"], "odd": "SEDIA", "category": "frutta"},
        {"items": ["CANE", "GATTO", "TAVOLO", "CAVALLO"], "odd": "TAVOLO", "category": "animali"},
        {"items": ["ROSSO", "BLU", "VERDE", "PANE"], "odd": "PANE", "category": "colori"},
        {"items": ["UNO", "DUE", "TRE", "CASA"], "odd": "CASA", "category": "numeri"},
        {"items": ["GENNAIO", "MARZO", "LIBRO", "LUGLIO"], "odd": "LIBRO", "category": "mesi"},
        {"items": ["FORCHETTA", "COLTELLO", "CUCCHIAIO", "SCARPA"], "odd": "SCARPA", "category": "posate"},
        {"items": ["OCCHI", "NASO", "BOCCA", "TELEFONO"], "odd": "TELEFONO", "category": "parti del viso"},
    ]
    
    selected = random.choice(categories)
    items = selected["items"].copy()
    random.shuffle(items)
    
    return {
        "items": items,
        "answer": selected["odd"],
        "category": selected["category"]
    }

def generate_copy_exercise(difficulty: str) -> Dict:
    """Generate a copy/write exercise"""
    if difficulty == "easy":
        words = ["CASA", "MAMMA", "PAPÀ", "SOLE", "LUNA", "MARE", "CIAO", "AMORE"]
        word = random.choice(words)
        return {"text": word, "type": "word"}
    elif difficulty == "medium":
        phrases = [
            "BUON GIORNO",
            "COME STAI",
            "GRAZIE MILLE",
            "TI VOGLIO BENE",
            "BELLA GIORNATA"
        ]
        return {"text": random.choice(phrases), "type": "phrase"}
    else:
        sentences = [
            "IL SOLE SPLENDE NEL CIELO",
            "IL GATTO DORME SUL DIVANO",
            "OGGI È UNA BELLA GIORNATA",
            "MI PIACE LEGGERE I LIBRI"
        ]
        return {"text": random.choice(sentences), "type": "sentence"}

def generate_recognition_exercise(difficulty: str) -> Dict:
    """Generate a recognition exercise"""
    objects = [
        {"name": "OROLOGIO", "hint": "Segna le ore"},
        {"name": "TELEFONO", "hint": "Per chiamare"},
        {"name": "CHIAVI", "hint": "Aprono la porta"},
        {"name": "OCCHIALI", "hint": "Per vedere meglio"},
        {"name": "PETTINE", "hint": "Per i capelli"},
        {"name": "TAZZA", "hint": "Per bere"},
        {"name": "FORBICI", "hint": "Per tagliare"},
        {"name": "OMBRELLO", "hint": "Quando piove"},
    ]
    
    count = 3 if difficulty == "easy" else (4 if difficulty == "medium" else 6)
    selected = random.sample(objects, count)
    
    return {
        "objects": selected,
        "show_hints": difficulty != "hard"
    }

def generate_memory_exercise(difficulty: str) -> Dict:
    """Generate a memory exercise (pairs)"""
    symbols = ["★", "●", "■", "▲", "♦", "♥", "♣", "♠", "○", "□"]
    
    count = 3 if difficulty == "easy" else (4 if difficulty == "medium" else 6)
    selected = random.sample(symbols, count)
    pairs = selected * 2
    random.shuffle(pairs)
    
    return {
        "cards": pairs,
        "pairs_count": count
    }

# Image-based exercise generators
IMAGE_SUBJECTS = {
    "maze": [
        "garden path", "forest trail", "castle maze", "simple house maze",
        "park pathway", "beach path", "mountain trail"
    ],
    "coloring": [
        "flower", "cat", "dog", "house", "tree", "sun", "butterfly",
        "fish", "bird", "apple", "car", "boat", "star", "heart"
    ],
    "differences": [
        "living room scene", "kitchen scene", "garden scene", "bedroom scene",
        "park scene", "beach scene", "farm scene"
    ],
    "connect_dots": [
        "star shape", "heart shape", "house outline", "tree outline",
        "flower outline", "cat face", "simple boat"
    ]
}

async def generate_image_exercise(exercise_type: str, difficulty: str, color_mode: str = "bw"):
    """Generate an image-based exercise using AI"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return None, "API key non configurata"
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        subject = random.choice(IMAGE_SUBJECTS.get(exercise_type, ["simple object"]))
        
        # Build prompt based on exercise type
        if exercise_type == "maze":
            complexity = "very simple" if difficulty == "easy" else ("simple" if difficulty == "medium" else "moderate")
            prompt = f"""Create a {complexity} maze puzzle for elderly cognitive exercise. 
            The maze should have a clear START marked at top and END marked at bottom.
            Simple rectangular maze with clear paths, thick black lines on white background.
            The path should be wide and easy to follow with a pencil.
            Style: clean black lines on pure white, no shading, printable.
            Theme: {subject}"""
        
        elif exercise_type == "coloring":
            detail = "very simple with minimal details" if difficulty == "easy" else ("simple" if difficulty == "medium" else "moderate detail")
            prompt = f"""Create a {detail} coloring page outline of a {subject}.
            Black outlines only on pure white background, no fills, no shading.
            Large, clear shapes suitable for elderly people to color.
            Thick clean lines, easy to see and color within.
            Style: simple line art coloring book page, printable."""
        
        elif exercise_type == "differences":
            diff_count = 3 if difficulty == "easy" else (5 if difficulty == "medium" else 7)
            prompt = f"""Create TWO similar simple drawings side by side for a 'spot the differences' puzzle.
            Scene: {subject}
            The two images should have exactly {diff_count} subtle differences.
            Style: simple black and white line drawings, clear and easy to see.
            Both images should be clearly separated, suitable for elderly cognitive exercise."""
        
        elif exercise_type == "connect_dots":
            dots = 10 if difficulty == "easy" else (15 if difficulty == "medium" else 20)
            prompt = f"""Create a connect-the-dots puzzle that forms a {subject}.
            Use exactly {dots} numbered dots (1 to {dots}) arranged to form the shape.
            Numbers should be large and clearly visible.
            When connected in order, the dots reveal the shape.
            Style: black dots and numbers on white background, simple and clear."""
        
        else:
            prompt = f"Simple black and white illustration for cognitive exercise, clear and easy to see"
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            return image_base64, None
        else:
            return None, "Nessuna immagine generata"
            
    except Exception as e:
        logging.error(f"Generate image exercise error: {e}")
        return None, str(e)

@api_router.post("/generate/exercise")
async def generate_exercise(request: GenerateExerciseRequest):
    """Generate a single exercise"""
    try:
        exercises = []
        
        for _ in range(request.quantity):
            exercise_id = str(uuid.uuid4())
            exercise_type = request.exercise_type
            difficulty = request.difficulty
            image_base64 = None
            
            # Check if this is an image-based exercise
            exercise_info = EXERCISE_TYPES.get(exercise_type, {})
            has_image = exercise_info.get("has_image", False)
            
            # Generate content based on type
            if exercise_type == "sequence":
                content = generate_sequence_exercise(difficulty)
                title = "Completa la Sequenza"
                instruction = "Quale numero manca? Scrivi il numero al posto del punto interrogativo."
            
            elif exercise_type == "math":
                content = generate_math_exercise(difficulty)
                title = "Calcola"
                instruction = f"Quanto fa {content['operand1']} {content['operator']} {content['operand2']}?"
            
            elif exercise_type == "match":
                content = generate_match_exercise(difficulty)
                title = "Collega"
                instruction = "Collega ogni parola alla sua descrizione."
            
            elif exercise_type == "odd_one_out":
                content = generate_odd_one_out_exercise(difficulty)
                title = "Trova l'Intruso"
                instruction = "Quale parola non appartiene al gruppo? Cerchiala."
            
            elif exercise_type == "copy":
                content = generate_copy_exercise(difficulty)
                title = "Copia e Scrivi"
                instruction = "Riscrivi la parola/frase nello spazio sottostante."
            
            elif exercise_type == "recognition":
                content = generate_recognition_exercise(difficulty)
                title = "Riconosci gli Oggetti"
                instruction = "Scrivi il nome di ogni oggetto."
            
            elif exercise_type == "memory":
                content = generate_memory_exercise(difficulty)
                title = "Memoria"
                instruction = "Trova le coppie di simboli uguali."
            
            elif exercise_type == "maze":
                content = {"type": "maze"}
                title = "Labirinto"
                instruction = "Trova la strada dall'INIZIO alla FINE. Traccia il percorso con la matita."
                if has_image:
                    image_base64, error = await generate_image_exercise(exercise_type, difficulty, request.color_mode)
                    if error:
                        logging.warning(f"Image generation failed: {error}")
            
            elif exercise_type == "coloring":
                subjects = ["fiore", "gatto", "casa", "albero", "farfalla", "pesce", "sole", "cuore"]
                subject = random.choice(subjects)
                content = {"subject": subject}
                title = "Colora il Disegno"
                instruction = f"Colora il disegno con i colori che preferisci."
                if has_image:
                    image_base64, error = await generate_image_exercise(exercise_type, difficulty, request.color_mode)
                    if error:
                        logging.warning(f"Image generation failed: {error}")
            
            elif exercise_type == "differences":
                diff_count = 3 if difficulty == "easy" else (5 if difficulty == "medium" else 7)
                content = {"differences_count": diff_count}
                title = "Trova le Differenze"
                instruction = f"Trova {diff_count} differenze tra le due immagini. Cerchiale."
                if has_image:
                    image_base64, error = await generate_image_exercise(exercise_type, difficulty, request.color_mode)
                    if error:
                        logging.warning(f"Image generation failed: {error}")
            
            elif exercise_type == "connect_dots":
                dots = 10 if difficulty == "easy" else (15 if difficulty == "medium" else 20)
                content = {"dots_count": dots}
                title = "Unisci i Puntini"
                instruction = f"Collega i puntini in ordine da 1 a {dots} per scoprire il disegno."
                if has_image:
                    image_base64, error = await generate_image_exercise(exercise_type, difficulty, request.color_mode)
                    if error:
                        logging.warning(f"Image generation failed: {error}")
            
            else:
                content = {}
                title = EXERCISE_TYPES.get(exercise_type, {}).get("name", "Esercizio")
                instruction = EXERCISE_TYPES.get(exercise_type, {}).get("description", "")
            
            exercise = Exercise(
                id=exercise_id,
                type=exercise_type,
                title=title,
                instruction=instruction,
                difficulty=difficulty,
                content=content,
                image_base64=image_base64
            )
            exercises.append(exercise.model_dump())
        
        return {"exercises": exercises}
        
    except Exception as e:
        logging.error(f"Generate exercise error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

@api_router.post("/generate/chapter")
async def generate_chapter(request: GenerateChapterRequest):
    """Generate a complete chapter with exercises"""
    try:
        chapter_id = str(uuid.uuid4())
        exercises = []
        
        for i in range(request.exercise_count):
            ex_request = GenerateExerciseRequest(
                exercise_type=request.exercise_type,
                difficulty=request.difficulty,
                quantity=1,
                color_mode=request.color_mode
            )
            result = await generate_exercise(ex_request)
            if result["exercises"]:
                exercises.append(result["exercises"][0])
        
        chapter = Chapter(
            id=chapter_id,
            title=request.chapter_title,
            description=f"Esercizi di {EXERCISE_TYPES.get(request.exercise_type, {}).get('name', request.exercise_type)}",
            exercise_type=request.exercise_type,
            exercises=[Exercise(**ex) for ex in exercises]
        )
        
        return chapter.model_dump()
        
    except Exception as e:
        logging.error(f"Generate chapter error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

@api_router.post("/generate/image")
async def generate_exercise_image(request: GenerateExerciseRequest):
    """Generate an image for exercises using AI"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        # Build prompt based on exercise type
        style = "simple line drawing, black and white, clear outlines, suitable for elderly people, large and clear"
        if request.color_mode == "color":
            style = "simple colorful illustration, clear shapes, high contrast, suitable for elderly people, large and clear"
        
        # If topic is provided, use it as the main prompt
        if request.topic:
            prompt = f"{request.topic}, {style}"
        else:
            prompts = {
                "differences": f"Two similar simple drawings side by side with 3-5 subtle differences, {style}",
                "maze": f"Simple maze puzzle with clear path, not too complex, {style}",
                "coloring": f"Simple outline drawing of a flower for coloring, {style}",
                "recognition": f"Clear simple drawings of common household objects arranged in a grid, {style}",
            }
            prompt = prompts.get(request.exercise_type, f"Simple illustration for cognitive exercise, {style}")
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            return {"image_base64": image_base64}
        else:
            raise HTTPException(status_code=500, detail="Nessuna immagine generata")
            
    except Exception as e:
        logging.error(f"Generate image error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

class CustomImageRequest(BaseModel):
    prompt: str
    color_mode: str = "bw"

@api_router.post("/generate/custom-image")
async def generate_custom_image(request: CustomImageRequest):
    """Generate a custom image based on user prompt"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        # Build style based on color mode
        style = "simple line drawing, black and white, clear outlines, suitable for elderly people, large and clear, printable"
        if request.color_mode == "color":
            style = "simple colorful illustration, clear shapes, high contrast, suitable for elderly people, large and clear"
        
        prompt = f"{request.prompt}, {style}"
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            return {"image_base64": image_base64}
        else:
            raise HTTPException(status_code=500, detail="Nessuna immagine generata")
            
    except Exception as e:
        logging.error(f"Generate custom image error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

@api_router.post("/generate/cover")
async def generate_cover(title: str = "Quaderno di Esercizi", style: str = "simple"):
    """Generate a book cover"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        prompt = f"""Book cover for cognitive exercises workbook titled "{title}". 
        Simple, calming design with soft colors. 
        Clear, large typography area at top.
        Gentle, reassuring imagery like nature elements or simple geometric patterns.
        Professional but warm and inviting. Suitable for elderly audience.
        No text on the image."""
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            return {"image_base64": image_base64}
        else:
            raise HTTPException(status_code=500, detail="Nessuna copertina generata")
            
    except Exception as e:
        logging.error(f"Generate cover error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

# Include the router
@api_router.post("/chat")
async def chat_with_assistant(request: ChatRequest):
    """Chat with AI assistant for book creation help"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        # Build system message with context
        system_message = """Sei un assistente esperto nella creazione di libri ed esercizi educativi. 
Puoi aiutare a:
- Creare esercizi personalizzati (matematica, sequenze, memoria, ecc.)
- Suggerire contenuti in base al tema e all'età target
- Generare idee per capitoli e struttura del libro
- Scrivere istruzioni chiare per gli esercizi
- Dare consigli su difficoltà e formato

Rispondi sempre in italiano in modo chiaro e utile.

Quando l'utente chiede di creare esercizi, genera il contenuto in formato strutturato.
Per esempio, se chiede "crea 3 esercizi di matematica facili", rispondi con gli esercizi formattati.

IMPORTANTE: Quando generi esercizi, usa questo formato JSON alla fine della risposta:
```json
{"exercises": [{"type": "math", "title": "Calcola", "instruction": "...", "content": {...}}]}
```
"""
        
        # Add book context if available
        if request.book_context:
            theme = request.book_context.get('theme', 'custom')
            title = request.book_context.get('title', '')
            system_message += f"\n\nContesto attuale: Stai lavorando su un libro '{title}' con tema '{theme}'."
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"chat-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        # Add history
        for msg in request.history[-10:]:  # Keep last 10 messages for context
            if msg.role == "user":
                await chat.send_message(UserMessage(text=msg.content))
        
        # Send current message
        message = UserMessage(text=request.message)
        response = await chat.send_message(message)
        
        # Try to extract exercises if present in response
        exercises = None
        if "```json" in response:
            try:
                import re
                json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
                if json_match:
                    import json
                    data = json.loads(json_match.group(1))
                    if "exercises" in data:
                        exercises = data["exercises"]
            except:
                pass
        
        return {
            "response": response,
            "exercises": exercises
        }
        
    except Exception as e:
        logging.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella chat: {str(e)}")

@api_router.post("/chat/generate-exercises")
async def chat_generate_exercises(request: ChatRequest):
    """Generate exercises based on chat request"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        system_message = """Sei un generatore di esercizi educativi. 
Genera esercizi in formato JSON valido.

Tipi di esercizi disponibili:
- sequence: Completa la sequenza (numeri)
- math: Calcoli matematici
- match: Collega parole e definizioni
- odd_one_out: Trova l'intruso
- copy: Copia e scrivi
- memory: Esercizi di memoria

RISPONDI SOLO con JSON valido nel formato:
{
  "exercises": [
    {
      "type": "math",
      "title": "Calcola",
      "instruction": "Quanto fa 5 + 3?",
      "difficulty": "easy",
      "content": {"operand1": 5, "operand2": 3, "operator": "+", "answer": 8}
    }
  ]
}
"""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"gen-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=request.message)
        response = await chat.send_message(message)
        
        # Parse JSON response
        import json
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("\n", 1)[1]
        if clean_response.endswith("```"):
            clean_response = clean_response.rsplit("```", 1)[0]
        clean_response = clean_response.strip()
        
        try:
            data = json.loads(clean_response)
            exercises = data.get("exercises", [])
            
            # Add IDs to exercises
            for ex in exercises:
                ex["id"] = str(uuid.uuid4())
            
            return {"exercises": exercises}
        except json.JSONDecodeError:
            return {"exercises": [], "raw_response": response}
        
    except Exception as e:
        logging.error(f"Generate exercises error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
