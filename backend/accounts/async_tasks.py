from concurrent.futures import ThreadPoolExecutor

from .invite_mailer import send_html_email, send_invite_email

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="hrcore-mail")


def send_html_email_async(*, to_email: str, subject: str, html: str):
    return _executor.submit(send_html_email, to_email=to_email, subject=subject, html=html)


def send_invite_email_async(*, to_email: str, full_name: str, invite_url: str):
    return _executor.submit(send_invite_email, to_email=to_email, full_name=full_name, invite_url=invite_url)
