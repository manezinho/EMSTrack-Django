def migrate(apps, schema_editor):
    """

    Run
    > ./manage.py makemigrations --empty equipment

    Edit the migration file to look like this

        from django.db import migrations
        from equipment.util.migrate_equipment_holder import migrate   # add this line

        class Migration(migrations.Migration):

        dependencies = [
            ('equipment', '0003_auto_20200715_2315'),                 # Leave whatever number is generated
        ]

        operations = [
            migrations.RunPython(migrate),                            # add this line
        ]

    Run the migration
    > ./manage.py migrate

    :param apps:
    :param schema_editor:
    :return:
    """

    EquipmentHolder = apps.get_model('equipment', 'EquipmentHolder')
    for e in EquipmentHolder.objects.all():
        if e.is_ambulance():
            e.tmp_ambulance = e.ambulance
        elif e.is_hospital():
            e.tmp_hospital = e.hospital
        else:
            continue
        e.save()
