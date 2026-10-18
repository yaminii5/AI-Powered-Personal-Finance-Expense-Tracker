import hashlib
import secrets


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using standard library PBKDF2-HMAC-SHA256.
    Generates a cryptographically random salt and returns '<salt>$<derived_key_hex>'.
    Zero external dependencies and 100% compatible with Python 3.13+.
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    )
    return f"{salt}${key.hex()}"


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against a stored '<salt>$<derived_key_hex>' hash
    using constant-time comparison to prevent timing attacks.
    """
    if not hashed_password or "$" not in hashed_password:
        return False
    try:
        salt, stored_key = hashed_password.split("$", 1)
        derived_key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000,
        )
        return secrets.compare_digest(derived_key.hex(), stored_key)
    except Exception:
        return False
