from sqlalchemy import Column, String, Float, ForeignKey, JSON, DateTime, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.connection import Base
import uuid


class FacialAnalysis(Base):
    __tablename__ = "facial_analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    overall_score = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False)
    harmony_score = Column(Float, nullable=False)
    symmetry_score = Column(Float, nullable=False)
    thirds_data = Column(JSON, nullable=False)
    radar_data = Column(JSON, nullable=False)
    highlights = Column(JSON, nullable=False)
    photo_front_url = Column(String(500), nullable=True)
    photo_right_url = Column(String(500), nullable=True)
    photo_left_url = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    attractiveness = Column(Integer, nullable=True)
    attributes_data = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="analyses")
    categories = relationship("AnalysisCategory", back_populates="analysis")


class AnalysisCategory(Base):
    __tablename__ = "analysis_categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("facial_analyses.id"), nullable=False)
    name = Column(String(100), nullable=False)
    score = Column(Float, nullable=False)
    badge = Column(String(50), nullable=False)

    # Relationships
    analysis = relationship("FacialAnalysis", back_populates="categories")


class WeeklyRoutine(Base):
    __tablename__ = "weekly_routines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    exercises = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
