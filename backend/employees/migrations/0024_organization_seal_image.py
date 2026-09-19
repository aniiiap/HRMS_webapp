from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('employees', '0023_resignation'),
    ]

    operations = [
        migrations.AddField(
            model_name='organization',
            name='seal_image',
            field=models.ImageField(blank=True, null=True, upload_to='organization_seals/'),
        ),
    ]
