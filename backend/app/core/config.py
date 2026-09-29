from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "RutaVivaMythF"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/rutaviva"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173"]

    OPEN_METEO_URL: str = "https://api.open-meteo.com/v1/forecast"
    GEOREF_URL: str = "https://apis.datos.gob.ar/georef/api/v2"
    OSRM_URL: str = "https://router.project-osrm.org"
    DATOS_GOB_URL: str = "https://datos.gob.ar/api/3/action"

    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "change-me-min-10-chars"
    ADMIN_FULL_NAME: str = "Admin"

    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:admin@example.com"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


settings = Settings()

# Hardening en producción: si SECRET_KEY quedó con el default, abortar el boot.
if settings.ENVIRONMENT == "production" and settings.SECRET_KEY in (
    "change-me-in-production",
    "",
    "CHANGE_ME_GENERATE_A_RANDOM_STRING",
):
    raise RuntimeError(
        "SECRET_KEY no está configurado en producción. Generar uno y "
        "setear la variable de entorno antes de arrancar el servidor."
    )
