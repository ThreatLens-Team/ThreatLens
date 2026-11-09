
import getpass
import sqlite3

from auth.database import (
    get_connection,
    initialize_database,
)
from auth.security import hash_password


def create_test_analyst():
    initialize_database()

    print("\nThreatLens — Test Analyst Setup\n")
    print("Development use only.\n")

    email = input("Analyst email: ").strip().lower()

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
            cursor = connection.execute(
                """
                INSERT INTO users
                    (email, password_hash, role)
                VALUES (?, ?, ?)
                """,
                (email, password_hash, "analyst"),
            )

            connection.commit()
            analyst_id = cursor.lastrowid

    except sqlite3.IntegrityError:
        print("This email is already registered.")
        return

    print("\nTest analyst created successfully.")
    print(f"Analyst ID: {analyst_id}")
    print("Role: analyst")
    print("\nThis account has no client assignments yet.")


if __name__ == "__main__":
    create_test_analyst()
