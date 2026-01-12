"""CLI for Simba."""

import argparse

import uvicorn
from sqlalchemy import text

from simba.models.base import SessionLocal


def list_organizations():
    """List all organizations from the database."""
    db = SessionLocal()
    try:
        result = db.execute(
            text("SELECT id, name, slug, created_at FROM organization ORDER BY created_at DESC")
        )
        rows = result.fetchall()

        if not rows:
            print("No organizations found.")
            print("\nCreate an organization in the Simba dashboard first.")
            return

        print(f"\n{'ID':<40} {'Name':<25} {'Slug':<20} {'Created'}")
        print("-" * 100)
        for row in rows:
            org_id, name, slug, created_at = row
            created_str = str(created_at)[:19] if created_at else "N/A"
            print(f"{org_id:<40} {(name or 'N/A'):<25} {(slug or 'N/A'):<20} {created_str}")
        print(f"\nTotal: {len(rows)} organization(s)")
        print("\nUse the ID value when configuring the simba-chat widget:")
        print('  <SimbaChatBubble organizationId="<ID>" ... />')
    finally:
        db.close()


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Simba - Customer Service Assistant",
        prog="simba",
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Server command (with 'serve' alias)
    server_parser = subparsers.add_parser("server", aliases=["serve"], help="Run the API server")
    server_parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    server_parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    server_parser.add_argument("--reload", action="store_true", help="Enable auto-reload")

    # Orgs command
    orgs_parser = subparsers.add_parser("orgs", help="Manage organizations")
    orgs_subparsers = orgs_parser.add_subparsers(dest="orgs_command", help="Organization commands")
    orgs_subparsers.add_parser("list", help="List all organizations")

    args = parser.parse_args()

    if args.command in ("server", "serve"):
        uvicorn.run(
            "simba.api.app:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
        )
    elif args.command == "orgs":
        if args.orgs_command == "list":
            list_organizations()
        else:
            orgs_parser.print_help()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
