def test_enterprise_contact_saves_to_db(client):
    r = client.post(
        "/api/v1/enterprise/contact",
        json={
            "full_name": "Juan Pérez",
            "email": "juan@empresa.com",
            "company": "Empresa SA",
            "role": "CTO",
            "fleet_size": "51-200",
            "message": "Queremos integrar el API a nuestros 120 vehículos.",
        },
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "juan@empresa.com"
    assert body["full_name"] == "Juan Pérez"
    assert body["kind"] == "enterprise"
    assert "id" in body


def test_contact_validates_email(client):
    r = client.post(
        "/api/v1/enterprise/contact",
        json={
            "full_name": "X",
            "email": "not-an-email",
            "message": "hola mundo",
        },
    )
    assert r.status_code == 422


def test_contact_requires_message(client):
    r = client.post(
        "/api/v1/enterprise/contact",
        json={"full_name": "X", "email": "a@b.com", "message": ""},
    )
    assert r.status_code == 422
