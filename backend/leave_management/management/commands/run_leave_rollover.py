from django.core.management.base import BaseCommand
from django.utils import timezone
from employees.models import Organization
from leave_management.rollover import preview_or_execute_leave_rollover


class Command(BaseCommand):
    help = "Run or preview annual leave carry-forward rollover for organizations."

    def add_arguments(self, parser):
        today = timezone.localdate()
        parser.add_argument("--from-year", type=int, default=today.year - 1, help="Source year to carry forward from.")
        parser.add_argument("--to-year", type=int, default=today.year, help="Target year to receive carry forward.")
        parser.add_argument("--org-id", type=int, default=None, help="Specific organization ID (default: all).")
        parser.add_argument("--dry-run", action="store_true", help="Preview calculations without saving changes.")

    def handle(self, *args, **options):
        from_year = options["from_year"]
        to_year = options["to_year"]
        org_id = options.get("org_id")
        dry_run = options.get("dry_run", False)

        orgs = Organization.objects.all()
        if org_id:
            orgs = orgs.filter(id=org_id)

        mode_str = "DRY RUN (Preview)" if dry_run else "EXECUTE (Applying changes)"
        self.stdout.write(self.style.NOTICE(f"Starting Carry-Forward Rollover ({from_year} -> {to_year}) [{mode_str}]"))

        total_applied = 0
        total_eligible = 0

        for org in orgs:
            res = preview_or_execute_leave_rollover(
                organization_id=org.id,
                from_year=from_year,
                to_year=to_year,
                dry_run=dry_run,
            )
            total_eligible += res["eligible_grants_count"]
            total_applied += res["applied_count"]
            self.stdout.write(f"Organization: {org.name} (ID {org.id}) -> {res['message']}")
            for item in res["items"]:
                self.stdout.write(
                    f"  - {item['employee_code']} ({item['employee_name']}): "
                    f"{item['rule_name']} -> {item['carry_forward_applied']} days"
                )

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"Finished Dry Run. Total eligible: {total_eligible}."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Finished Rollover. Successfully applied {total_applied} carry-forward records."))
