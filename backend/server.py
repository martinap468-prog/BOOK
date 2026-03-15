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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

class ChapterContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    content: str = ""
    order: int = 0
    images: List[str] = []

class BookSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    page_count: int = 50
    chapter_count: int = 5
    color_mode: str = "color"  # "color" or "bw"
    format: str = "6x9"  # "5x8", "6x9", "8.5x11"
    font_family: str = "Crimson Pro"
    font_size: int = 12
    line_height: float = 1.6

class Book(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Nuovo Libro"
    author: str = ""
    topic: str = ""
    description: str = ""
    cover_image: Optional[str] = None
    chapters: List[ChapterContent] = []
    settings: BookSettings = Field(default_factory=BookSettings)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BookCreate(BaseModel):
    title: str = "Nuovo Libro"
    author: str = ""
    topic: str = ""
    description: str = ""
    settings: Optional[BookSettings] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    topic: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    chapters: Optional[List[ChapterContent]] = None
    settings: Optional[BookSettings] = None

class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    order: Optional[int] = None
    images: Optional[List[str]] = None

class GenerateContentRequest(BaseModel):
    topic: str
    chapter_title: str
    word_count: int = 500
    style: str = "informativo"
    language: str = "italiano"

class GenerateOutlineRequest(BaseModel):
    topic: str
    chapter_count: int = 5
    style: str = "informativo"
    language: str = "italiano"

class GenerateImageRequest(BaseModel):
    prompt: str
    style: str = "realistic"
    size: str = "1024x1024"

class GenerateCoverRequest(BaseModel):
    title: str
    author: str
    topic: str
    style: str = "modern"

# ============== BOOK ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "BookCreator AI API"}

@api_router.post("/books", response_model=Book)
async def create_book(book_data: BookCreate):
    settings = book_data.settings or BookSettings()
    book = Book(
        title=book_data.title,
        author=book_data.author,
        topic=book_data.topic,
        description=book_data.description,
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
        # Handle nested settings
        if "settings" in update_dict and update_dict["settings"]:
            update_dict["settings"] = update_dict["settings"].model_dump() if hasattr(update_dict["settings"], 'model_dump') else update_dict["settings"]
        # Handle chapters
        if "chapters" in update_dict and update_dict["chapters"]:
            update_dict["chapters"] = [c.model_dump() if hasattr(c, 'model_dump') else c for c in update_dict["chapters"]]
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

# ============== CHAPTER ENDPOINTS ==============

@api_router.post("/books/{book_id}/chapters", response_model=ChapterContent)
async def add_chapter(book_id: str, chapter: ChapterContent):
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    
    chapter_dict = chapter.model_dump()
    await db.books.update_one(
        {"id": book_id},
        {
            "$push": {"chapters": chapter_dict},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    return chapter

@api_router.put("/books/{book_id}/chapters/{chapter_id}", response_model=ChapterContent)
async def update_chapter(book_id: str, chapter_id: str, update_data: ChapterUpdate):
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Libro non trovato")
    
    chapters = book.get("chapters", [])
    chapter_index = None
    for i, ch in enumerate(chapters):
        if ch["id"] == chapter_id:
            chapter_index = i
            break
    
    if chapter_index is None:
        raise HTTPException(status_code=404, detail="Capitolo non trovato")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    for key, value in update_dict.items():
        chapters[chapter_index][key] = value
    
    await db.books.update_one(
        {"id": book_id},
        {
            "$set": {
                "chapters": chapters,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    return ChapterContent(**chapters[chapter_index])

@api_router.delete("/books/{book_id}/chapters/{chapter_id}")
async def delete_chapter(book_id: str, chapter_id: str):
    result = await db.books.update_one(
        {"id": book_id},
        {
            "$pull": {"chapters": {"id": chapter_id}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Capitolo non trovato")
    return {"message": "Capitolo eliminato"}

# ============== AI GENERATION ENDPOINTS ==============

@api_router.post("/generate/outline")
async def generate_outline(request: GenerateOutlineRequest):
    """Generate book outline with chapter titles"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"outline-{uuid.uuid4()}",
            system_message="Sei un esperto scrittore e editor. Genera strutture di libri professionali e coinvolgenti."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Genera una struttura per un libro sull'argomento: "{request.topic}"
        
Il libro deve avere {request.chapter_count} capitoli.
Stile: {request.style}
Lingua: {request.language}

Rispondi SOLO con un JSON valido nel seguente formato, senza altro testo:
{{
    "title": "Titolo del libro",
    "description": "Breve descrizione del libro (2-3 frasi)",
    "chapters": [
        {{"title": "Titolo Capitolo 1", "summary": "Breve descrizione del capitolo"}},
        {{"title": "Titolo Capitolo 2", "summary": "Breve descrizione del capitolo"}}
    ]
}}"""

        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse JSON response
        import json
        # Clean response - remove markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("\n", 1)[1]
        if clean_response.endswith("```"):
            clean_response = clean_response.rsplit("```", 1)[0]
        clean_response = clean_response.strip()
        
        outline = json.loads(clean_response)
        return outline
        
    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error: {e}, response: {response}")
        raise HTTPException(status_code=500, detail="Errore nel parsing della risposta AI")
    except Exception as e:
        logging.error(f"Generate outline error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

@api_router.post("/generate/content")
async def generate_content(request: GenerateContentRequest):
    """Generate chapter content"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"content-{uuid.uuid4()}",
            system_message="Sei un esperto scrittore. Scrivi contenuti professionali, coinvolgenti e ben strutturati per libri."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Scrivi il contenuto per un capitolo di libro.

Argomento del libro: {request.topic}
Titolo del capitolo: {request.chapter_title}
Lunghezza desiderata: circa {request.word_count} parole
Stile: {request.style}
Lingua: {request.language}

Scrivi il contenuto del capitolo in modo professionale e coinvolgente. 
Includi sottosezioni se appropriato. Non includere il titolo del capitolo nella risposta.
Usa paragrafi ben strutturati."""

        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        return {"content": response}
        
    except Exception as e:
        logging.error(f"Generate content error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore nella generazione: {str(e)}")

@api_router.post("/generate/image")
async def generate_image(request: GenerateImageRequest):
    """Generate an image using AI"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        enhanced_prompt = f"{request.prompt}, {request.style} style, high quality, professional"
        
        images = await image_gen.generate_images(
            prompt=enhanced_prompt,
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

@api_router.post("/generate/cover")
async def generate_cover(request: GenerateCoverRequest):
    """Generate a book cover"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="API key non configurata")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        style_descriptions = {
            "modern": "modern minimalist book cover design, clean typography, contemporary style",
            "classic": "classic elegant book cover, traditional publishing style, sophisticated",
            "artistic": "artistic creative book cover, unique visual design, eye-catching",
            "photo": "photographic book cover, professional photography based, high quality image"
        }
        
        style_desc = style_descriptions.get(request.style, style_descriptions["modern"])
        
        prompt = f"""Professional book cover for a book titled "{request.title}" by {request.author}.
Topic: {request.topic}
Style: {style_desc}
The cover should be visually striking and suitable for Amazon KDP publishing.
Do NOT include any text on the cover - just the visual design/imagery."""
        
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
