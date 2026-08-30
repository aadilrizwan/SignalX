"""
SignalX —- Supabase Cloud Service

Manages cloud operations with Supabase:
- Storage: Uploading AI Evidence Package dossiers & documents
- Realtime: Broadcasting live risk scoring events to connected dashboards
- Auth & Database: Multi-tenant organization verification
"""

import os
import json
import logging
from typing import Optional, Dict, Any, Tuple
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv()

logger = logging.getLogger(__name__)


class SupabaseService:
    """Enterprise client for Supabase Cloud Storage, Realtime, and Database."""

    def __init__(self, url: Optional[str] = None, key: Optional[str] = None, use_env: bool = True):
        if use_env and url is None and key is None:
            raw_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            raw_key = (
                os.getenv("SUPABASE_SERVICE_ROLE_KEY") or
                os.getenv("SUPABASE_SECRET_KEY") or
                os.getenv("SUPABASE_PUBLISHABLE_KEY") or
                os.getenv("SUPABASE_ANON_KEY") or
                os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or
                os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            )
        else:
            raw_url = url
            raw_key = key

        if use_env and (not raw_url or not raw_key):
            try:
                from backend.app.config import get_settings
                settings = get_settings()
                raw_url = raw_url or settings.supabase_url
                raw_key = (
                    raw_key or
                    settings.supabase_service_role_key or
                    getattr(settings, "supabase_publishable_key", None) or
                    settings.supabase_anon_key
                )
            except Exception:
                pass

        self.url = raw_url.strip() if raw_url else None
        self.key = raw_key.strip() if raw_key else None
        self.client = None
        self.is_connected = False

        if self.url and self.key and "your-project" not in self.url:
            try:
                from supabase import create_client, Client
                self.client: Client = create_client(self.url, self.key)
                self.is_connected = True
                logger.info("SupabaseService successfully initialized with %s", self.url)
            except Exception as e:
                logger.warning("Failed to initialize Supabase client: %s. Using local fallback mode.", e)
                self.is_connected = False
        else:
            logger.info("Supabase credentials not configured in environment. Operating in mock/local mode.")

    def upload_dossier(
        self,
        dossier_id: str,
        content: bytes,
        file_extension: str = "pdf",
        content_type: str = "application/pdf"
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Uploads an Evidence Dossier file to the Supabase 'evidence-dossiers' storage bucket.
        Returns: (success, public_url, error_message)
        """
        file_name = f"{dossier_id}.{file_extension}"
        storage_path = f"dossiers/{file_name}"

        if not self.is_connected or not self.client:
            # Return realistic mock public URL
            mock_url = f"https://mock-supabase.signalx.ai/storage/v1/object/public/evidence-dossiers/{storage_path}"
            return True, mock_url, None

        try:
            # Ensure bucket exists
            try:
                self.client.storage.create_bucket("evidence-dossiers", {"public": True})
            except Exception:
                pass  # Bucket likely already exists

            # Upload or upsert
            response = self.client.storage.from_("evidence-dossiers").upload(
                path=storage_path,
                file=content,
                file_options={"content-type": content_type, "upsert": "true"}
            )

            # Get public URL
            public_url = self.client.storage.from_("evidence-dossiers").get_public_url(storage_path)
            return True, public_url, None
        except Exception as e:
            logger.error("Supabase Storage upload error for %s: %s", storage_path, e)
            return False, None, str(e)

    def broadcast_transaction_event(self, transaction_data: Dict[str, Any]) -> bool:
        """
        Broadcasts a live transaction risk evaluation event to the realtime stream.
        """
        if not self.is_connected or not self.client:
            return True  # Handled locally via simulation

        try:
            # Insert into transactions table or send via Supabase Broadcast channel
            self.client.table("transactions").insert(transaction_data).execute()
            return True
        except Exception as e:
            logger.warning("Supabase Realtime broadcast failed: %s", e)
            return False

    def sync_dispute_case(self, chargeback_data: Dict[str, Any]) -> bool:
        """
        Syncs a chargeback dispute case to Supabase PostgreSQL database.
        """
        if not self.is_connected or not self.client:
            return True

        try:
            self.client.table("chargebacks").upsert(chargeback_data).execute()
            return True
        except Exception as e:
            logger.warning("Supabase sync_dispute_case failed: %s", e)
            return False


# Singleton instance
_supabase_service: Optional[SupabaseService] = None


def get_supabase_service() -> SupabaseService:
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service
