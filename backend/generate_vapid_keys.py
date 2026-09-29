"""Genera un par de claves VAPID para Web Push y las imprime listas para pegar al .env.

Uso:
    python generate_vapid_keys.py

Output:
    VAPID_PUBLIC_KEY=...
    VAPID_PRIVATE_KEY=...

Correr una sola vez por proyecto; guardar en variables de entorno (nunca commitear).
"""
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main() -> None:
    priv = ec.generate_private_key(ec.SECP256R1())
    pub = priv.public_key()

    priv_pem = priv.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    priv_raw = priv.private_numbers().private_value.to_bytes(32, "big")
    pub_bytes = pub.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    print("# Generado por generate_vapid_keys.py")
    print(f"VAPID_PUBLIC_KEY={b64url(pub_bytes)}")
    print(f"VAPID_PRIVATE_KEY={b64url(priv_raw)}")
    print()
    print("# PEM (guardar si preferís ese formato):")
    print(priv_pem.decode("ascii"))


if __name__ == "__main__":
    main()
