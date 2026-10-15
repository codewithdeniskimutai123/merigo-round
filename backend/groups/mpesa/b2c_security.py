
import base64
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding


def encrypt_b2c_initiator_password(password):
    certificate_path = Path(__file__).parent / "certificates" / "SandboxCertificate.cer"

    certificate_data = certificate_path.read_bytes()
    certificate = x509.load_pem_x509_certificate(certificate_data)

    public_key = certificate.public_key()

    encrypted_password = public_key.encrypt(
        password.encode("utf-8"),
        padding.PKCS1v15(),
    )

    return base64.b64encode(encrypted_password).decode("utf-8")
