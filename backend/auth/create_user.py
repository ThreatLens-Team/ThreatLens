
import getpass
import sqlite3

from auth.database import (
    get_connection,
    initialize_database,
)
from auth.security import hash_password


def create_admin():
    initialize_database()

    print("\nThreatLens — Initial Admin Setup\n")

    with get_connection() as connection:
        existing_admin = connection.execute(
            "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
        ).fetchone()

    if existing_admin:
        print("An administrator already exists.")
        print("Initial setup is disabled.")
        return

    email = input("Admin email: ").strip().lower()

    if not email or "@" not in email:
        print("Please enter a valid email address.")
        return

    password = getpass.getpass("Password: ")
    confirmation = getpass.getpass("Confirm password: ")

    if password != confirmation:
        print("Passwords do not match.")
        return

    if len(password) < 15:
        print("Password must contain at least 15 characters.")
        return

    if len(password) > 128:
        print("Password is too long.")
        return

    password_hash = hash_password(password)

    try:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO users
                    (email, password_hash, role)
                VALUES (?, ?, ?)
                """,
                (email, password_hash, "admin"),
            )
            connection.commit()

    except sqlite3.IntegrityError:
        print("This email is already registered.")
        return

    print("\nAdministrator account created successfully.")


if __name__ == "__main__":
    create_admin()
