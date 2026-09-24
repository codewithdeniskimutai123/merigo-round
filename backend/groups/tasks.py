from celery import shared_task

from .models import Transaction
from .services import reconcile_pending_transaction


@shared_task
def reconcile_pending_transactions():
    pending_transactions = Transaction.objects.filter(
        status=Transaction.Status.PENDING
    )

    processed = 0
    failed = 0

    for payment in pending_transactions:
        try:
            reconcile_pending_transaction(payment.id)
            processed += 1
        except Exception:
            failed += 1

    return {
        "processed": processed,
        "failed": failed,
    }