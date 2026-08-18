import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr = Field(..., max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)

    @field_validator("full_name")
    @classmethod
    def sanitize_full_name(cls, v):
        if v is not None:
            v = re.sub(r'[<>"\'`;\\]', '', v)
            v = v.strip()
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiuscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minuscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um numero")
        return v


class UserResponse(UserBase):
    id: str
    is_active: bool
    is_verified: bool
    role: str = "client"

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None


class RegisterResponse(BaseModel):
    message: str
    requires_verification: bool = True


class VerifyEmailResponse(BaseModel):
    message: str


class ResendConfirmationRequest(BaseModel):
    email: EmailStr = Field(..., max_length=255)


class ResendConfirmationResponse(BaseModel):
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., max_length=255)


class ForgotPasswordResponse(BaseModel):
    message: str = "Se o e-mail estiver cadastrado, um link de recuperação foi enviado."


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=256)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra maiuscula")
        if not any(c.islower() for c in v):
            raise ValueError("A senha deve conter pelo menos uma letra minuscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("A senha deve conter pelo menos um numero")
        return v


class ResetPasswordResponse(BaseModel):
    message: str


