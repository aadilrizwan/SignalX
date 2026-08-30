"""
Unit Tests for Authentication & Role-Based Access Control (RBAC)
"""

import pytest
from fastapi import HTTPException
from backend.app.auth import get_current_user, require_role, UserPrincipal, DEMO_PRINCIPALS


@pytest.mark.asyncio
async def test_get_current_user_default_fallback():
    user = await get_current_user(authorization=None)
    assert user.role == "ANALYST"
    assert user.name == "MA RIZWAN"


@pytest.mark.asyncio
async def test_get_current_user_demo_admin_token():
    user = await get_current_user(authorization="Bearer demo_admin")
    assert user.role == "ADMIN"
    assert user.name == "MARQ"


@pytest.mark.asyncio
async def test_get_current_user_demo_analyst_token():
    user = await get_current_user(authorization="Bearer demo_analyst")
    assert user.role == "ANALYST"


@pytest.mark.asyncio
async def test_require_role_admin_allows_admin():
    checker = require_role("ADMIN")
    admin_user = DEMO_PRINCIPALS["ADMIN"]
    result = await checker(admin_user)
    assert result.role == "ADMIN"


@pytest.mark.asyncio
async def test_require_role_admin_blocks_analyst():
    checker = require_role("ADMIN")
    analyst_user = DEMO_PRINCIPALS["ANALYST"]
    with pytest.raises(HTTPException) as exc:
        await checker(analyst_user)
    assert exc.value.status_code == 403
    assert "ADMIN" in exc.value.detail
