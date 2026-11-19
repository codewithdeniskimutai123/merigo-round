
import base64
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives.asymmetric import padding, rsa


def encrypt_b2c_initiator_password(password):
    if not password:
        raise ValueError("B2C initiator password is required.")

    certificate_path = (
        Path(__file__).parent
        / "certificates"
        / "SandboxCertificate.cer"
    )

    if not certificate_path.exists():
        raise FileNotFoundError(
            f"B2C certificate not found: {certificate_path}"
        )

    certificate_data = certificate_path.read_bytes()

    try:
        certificate = x509.load_pem_x509_certificate(
            certificate_data
        )
    except ValueError:
        certificate = x509.load_der_x509_certificate(
            certificate_data
        )

    public_key = certificate.public_key()

    if not isinstance(public_key, rsa.RSAPublicKey):
        raise ValueError(
            "The B2C certificate must contain an RSA public key."
        )

    encrypted_password = public_key.encrypt(
        password.encode("utf-8"),
        padding.PKCS1v15(),
    )

    return base64.b64encode(
        encrypted_password
    ).decode("utf-8")
