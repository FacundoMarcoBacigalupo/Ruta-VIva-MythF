def _get_token(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "reporter@t.com", "password": "GoodPass1X"},
    )
    return r.json()["access_token"]


def test_create_report_requires_auth(client):
    r = client.post(
        "/api/v1/reports",
        json={"report_type": "bache", "lat": -34.6, "lon": -58.4, "severity": 3},
    )
    assert r.status_code == 401


def test_create_and_list_report(client):
    token = _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(
        "/api/v1/reports",
        json={"report_type": "bache", "description": "Bache grande", "lat": -34.6, "lon": -58.4, "severity": 3},
        headers=headers,
    )
    assert r.status_code == 201
    report_id = r.json()["id"]

    r2 = client.get("/api/v1/reports?hours=1")
    assert r2.status_code == 200
    assert any(item["id"] == report_id for item in r2.json())


def test_cannot_verify_same_report_twice(client):
    token = _get_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post(
        "/api/v1/reports",
        json={"report_type": "niebla", "lat": -34.6, "lon": -58.4, "severity": 4},
        headers=headers,
    )
    rid = r.json()["id"]

    r1 = client.post(f"/api/v1/reports/{rid}/verify", headers=headers)
    assert r1.status_code == 200
    r2 = client.post(f"/api/v1/reports/{rid}/verify", headers=headers)
    assert r2.status_code == 409
