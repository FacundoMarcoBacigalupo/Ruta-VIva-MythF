def test_register_and_login(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "user@test.com", "password": "StrongPass1", "full_name": "Test User"},
    )
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == "user@test.com"

    r2 = client.post(
        "/api/v1/auth/login",
        json={"email": "user@test.com", "password": "StrongPass1"},
    )
    assert r2.status_code == 200
    assert "access_token" in r2.json()


def test_register_rejects_weak_password(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "u@t.com", "password": "short"},
    )
    assert r.status_code == 422

    r2 = client.post(
        "/api/v1/auth/register",
        json={"email": "u@t.com", "password": "alllowercaseee"},
    )
    assert r2.status_code == 422


def test_duplicate_email_rejected(client):
    payload = {"email": "dup@t.com", "password": "GoodPass1X", "full_name": "A"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 201
    r2 = client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


def test_login_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "x@t.com", "password": "Correct123"},
    )
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "x@t.com", "password": "WrongOne1"},
    )
    assert r.status_code == 401


def test_me_requires_token(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_returns_current_user(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "me@t.com", "password": "GoodPass1X"},
    )
    token = r.json()["access_token"]
    r2 = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
    assert r2.json()["email"] == "me@t.com"
