from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from app.modules.auth.models import UserRole


class UserLogin(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str


class UserProvisionRequest(BaseModel):
    """
    Used exclusively by System Admin to provision a new employee account.
    The System Admin selects the employee's permanent role and entity scope.
    """
    email: Optional[str] = None
    username: Optional[str] = None
    employee_id: Optional[str] = None
    full_name: str
    role: UserRole
    org_node_id: Optional[str] = None  # Scoped subsidiary / project ID (None for group wide)
    initial_password: Optional[str] = Field(None, min_length=6, description="Custom initial password; if omitted, a strong temporary password is generated")


class UserProvisionResponse(BaseModel):
    """
    Returned to the System Admin upon successful user provisioning.
    System Admin copies these credentials to give directly to the employee.
    """
    id: str
    email: str
    full_name: str
    role: str
    org_node_id: Optional[str]
    initial_password: str
    message: str = "User provisioned successfully. Hand these credentials to the employee."


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    org_node_id: Optional[str] = None
    is_active: bool
    must_change_password: bool
    mfa_enabled: bool
    created_at: Optional[datetime] = None


class UserRoleAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    role: str
    entity_id: Optional[str]
    valid_from: date
    valid_to: Optional[date]
    is_active: bool


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserRead


class BootstrapAdminRequest(BaseModel):
    email: EmailStr = "admin@meil.in"
    full_name: str = "MEIL System Administrator"
    password: str = Field(..., min_length=8)
    secret_key: Optional[str] = None


class TokenPayload(BaseModel):
    sub: str
    role: str
    org_node_id: Optional[str] = None
    exp: Optional[int] = None

