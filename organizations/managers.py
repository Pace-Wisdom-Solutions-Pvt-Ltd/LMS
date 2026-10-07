# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.db import models
from lms_core.models import SoftDeleteQuerySet, SoftDeleteManager

def _is_user_val(v, user_model):
    if isinstance(v, user_model):
        return True
    if isinstance(v, (list, tuple, set)) and v and isinstance(next(iter(v)), user_model):
        return True
    return False

def _get_member_uuids(v, user_model, org_member_model):
    if isinstance(v, user_model):
        return list(org_member_model.objects.filter(user=v).values_list('uuid', flat=True))
    return list(org_member_model.objects.filter(user__in=v).values_list('uuid', flat=True))

def _traverse_field_path(model, parts):
    from django.core.exceptions import FieldDoesNotExist
    curr_model = model
    for i, part in enumerate(parts):
        try:
            field = curr_model._meta.get_field(part)
        except FieldDoesNotExist:
            return None, None, None
            
        if field.is_relation:
            related_model = field.related_model
            if related_model and related_model.__name__ == 'OrganizationMember':
                return related_model, field, parts[i+1:]
            curr_model = related_model
        else:
            return None, None, None
    return None, None, None

def _resolve_user_val_lookup(model, parts, v, user_model, org_member_model):
    if not _is_user_val(v, user_model):
        return None, None
    uuids = _get_member_uuids(v, user_model, org_member_model)
    prev_model = model
    for idx, part in enumerate(parts):
        f = prev_model._meta.get_field(part)
        if f.is_relation and f.related_model == org_member_model:
            prefix = parts[:idx]
            member_field_name = part
            new_key = '__'.join(prefix + [member_field_name, 'uuid', 'in'])
            return new_key, uuids
        prev_model = f.related_model
    return None, None

def _resolve_remaining_parts_lookup(model, parts, remaining, v, org_member_model):
    if len(remaining) == 0:
        return None, None
    prev_model = model
    for idx, part in enumerate(parts):
        f = prev_model._meta.get_field(part)
        if f.is_relation and f.related_model == org_member_model:
            prefix = parts[:idx]
            member_field_name = part
            attr_name = remaining[0]
            org_member_fields = {field.name for field in org_member_model._meta.get_fields()}
            if attr_name == 'user_id':
                new_parts = prefix + [member_field_name, 'user', 'id'] + remaining[1:]
                return '__'.join(new_parts), v
            if attr_name not in org_member_fields and attr_name not in ('uuid', 'pk', 'id', 'user'):
                new_parts = prefix + [member_field_name, 'user'] + remaining
                return '__'.join(new_parts), v
            break
        prev_model = f.related_model
    return None, None

def _resolve_lookup_path(model, k, v, user_model, org_member_model):
    parts = k.split('__')
    target_model, _, remaining = _traverse_field_path(model, parts)
    if not target_model:
        return None, None
        
    new_key, new_val = _resolve_user_val_lookup(model, parts, v, user_model, org_member_model)
    if new_key is not None:
        return new_key, new_val
        
    return _resolve_remaining_parts_lookup(model, parts, remaining, v, org_member_model)

def _resolve_q(q, model, user_model, org_member_model):
    from django.db.models import Q
    new_children = []
    for child in q.children:
        if isinstance(child, Q):
            new_children.append(_resolve_q(child, model, user_model, org_member_model))
        elif isinstance(child, tuple) and len(child) == 2:
            k, v = child
            new_key, new_val = _resolve_lookup_path(model, k, v, user_model, org_member_model)
            if new_key is not None:
                new_children.append((new_key, new_val))
            else:
                new_children.append(child)
        else:
            new_children.append(child)
    q.children = new_children
    return q

class TenantIsolatedQuerySet(SoftDeleteQuerySet):
    def filter(self, *args, **kwargs):
        from django.contrib.auth import get_user_model
        from organizations.models import OrganizationMember
        from django.db.models import Q
        user_model = get_user_model()
        
        new_kwargs = {}
        for k, v in kwargs.items():
            new_key, new_val = _resolve_lookup_path(self.model, k, v, user_model, OrganizationMember)
            if new_key is not None:
                new_kwargs[new_key] = new_val
            else:
                new_kwargs[k] = v
                
        new_args = [
            _resolve_q(arg, self.model, user_model, OrganizationMember) if isinstance(arg, Q) else arg
            for arg in args
        ]
                
        return super().filter(*new_args, **new_kwargs)

    def create(self, **kwargs):
        kwargs = self._resolve_member(kwargs)
        return super().create(**kwargs)
        
    def get_or_create(self, defaults=None, **kwargs):
        kwargs = self._resolve_member(kwargs)
        return super().get_or_create(defaults=defaults, **kwargs)
        
    def update_or_create(self, defaults=None, **kwargs):
        kwargs = self._resolve_member(kwargs)
        return super().update_or_create(defaults=defaults, **kwargs)

    def _get_or_create_student_member(self, user, org):
        from organizations.models import OrganizationMember, Role
        student_role, _ = Role.objects.get_or_create(
            name='student',
            defaults={'description': 'Student Role'}
        )
        member, _ = OrganizationMember.objects.get_or_create(
            user=user,
            organization=org,
            defaults={'role': student_role}
        )
        if not member.roles.filter(id=student_role.id).exists():
            member.roles.add(student_role)
        return member

    def _resolve_member(self, kwargs):
        from django.contrib.auth import get_user_model
        from organizations.models import Organization
        import uuid
        user_model = get_user_model()
        
        org = self._find_organization(kwargs)
        if not org:
            org = Organization.objects.first()
            
        for field in self.model._meta.get_fields():
            if field.is_relation and field.related_model and field.related_model.__name__ == 'OrganizationMember':
                field_name = field.name
                val = kwargs.get(field_name)
                val_id = kwargs.get(f"{field_name}_id")
                
                if val and isinstance(val, user_model):
                    kwargs[field_name] = self._get_or_create_student_member(val, org)
                elif val_id and isinstance(val_id, (str, uuid.UUID)):
                    try:
                        user = user_model.objects.get(id=val_id)
                        kwargs[field_name] = self._get_or_create_student_member(user, org)
                        del kwargs[f"{field_name}_id"]
                    except user_model.DoesNotExist:
                        pass
        return kwargs

    def _find_organization(self, kwargs):
        resolvers = {
            'batch': lambda obj: obj.organization,
            'node': lambda obj: obj.module.course.organization,
            'quiz': lambda obj: obj.course.organization if hasattr(obj, 'course') else obj.node.module.course.organization,
            'task': lambda obj: obj.node.module.course.organization,
            'assignment': lambda obj: obj.assessment.organization if hasattr(obj.assessment, 'organization') else obj.assessment.node.module.course.organization,
            'assessment': lambda obj: obj.organization if hasattr(obj, 'organization') else obj.node.module.course.organization,
            'course': lambda obj: obj.organization,
            'organization': lambda obj: obj
        }
        for key, resolver in resolvers.items():
            if key in kwargs:
                try:
                    return resolver(kwargs[key])
                except AttributeError:
                    pass
        return None

class TenantIsolatedManager(SoftDeleteManager):
    def get_queryset(self):
        qs = TenantIsolatedQuerySet(self.model, using=self._db)
        if hasattr(self.model, 'is_deleted'):
            qs = qs.filter(is_deleted=False)
        return qs
        
    def everything(self):
        return TenantIsolatedQuerySet(self.model, using=self._db)

def _resolve_single_lookup(k, v, user_model):
    import uuid
    if isinstance(v, user_model):
        return 'user', v
    if isinstance(v, (str, uuid.UUID)):
        return 'user_id', v
    return k, v

def _resolve_in_lookup(v, user_model):
    resolved = []
    for item in v:
        if isinstance(item, user_model):
            resolved.append(item.id)
        else:
            resolved.append(item)
    return 'user_id__in', resolved

def _resolve_lookup_kwargs(kwargs):
    from django.contrib.auth import get_user_model
    user_model = get_user_model()
    new_kwargs = {}
    for k, v in kwargs.items():
        if k in ('id', 'pk'):
            new_key, new_val = _resolve_single_lookup(k, v, user_model)
            new_kwargs[new_key] = new_val
        elif k in ('id__in', 'pk__in'):
            new_key, new_val = _resolve_in_lookup(v, user_model)
            new_kwargs[new_key] = new_val
        else:
            new_kwargs[k] = v
    return new_kwargs

class TenantIsolatedManyToManyManager:
    def __init__(self, original_manager, instance):
        self.original_manager = original_manager
        self.instance = instance

    def __getattr__(self, name):
        return getattr(self.original_manager, name)

    def __iter__(self):
        return iter(self.all())

    def __len__(self):
        return len(self.all())

    def __bool__(self):
        return True

    def get_queryset(self):
        qs = self.original_manager.get_queryset()
        original_filter = qs.filter
        def wrapped_filter(*args, **kwargs):
            return original_filter(*args, **_resolve_lookup_kwargs(kwargs))
        qs.filter = wrapped_filter

        original_exclude = qs.exclude
        def wrapped_exclude(*args, **kwargs):
            return original_exclude(*args, **_resolve_lookup_kwargs(kwargs))
        qs.exclude = wrapped_exclude
        return qs

    def _resolve_objs(self, objs, role_name='teacher'):
        from django.contrib.auth import get_user_model
        from organizations.models import OrganizationMember, Role, Organization
        user_model = get_user_model()
        
        resolved_objs = []
        role = None
        for obj in objs:
            if not isinstance(obj, user_model):
                resolved_objs.append(obj)
                continue
                
            org = getattr(self.instance, 'organization', None)
            if not org:
                assessment = getattr(self.instance, 'assessment', None)
                org = getattr(assessment, 'organization', None) if assessment else None
            if not org:
                org = Organization.objects.first()
                
            if not role:
                role = Role.objects.filter(name=role_name).first()
                
            member, _ = OrganizationMember.objects.get_or_create(
                user=obj,
                organization=org,
                defaults={'role': role}
            )
            resolved_objs.append(member)
        return resolved_objs

    def add(self, *objs, **kwargs):
        return self.original_manager.add(*self._resolve_objs(objs), **kwargs)

    def remove(self, *objs, **kwargs):
        from django.contrib.auth import get_user_model
        from organizations.models import OrganizationMember
        user_model = get_user_model()
        resolved_objs = []
        for obj in objs:
            if isinstance(obj, user_model):
                resolved_objs.extend(OrganizationMember.objects.filter(user=obj))
            else:
                resolved_objs.append(obj)
        return self.original_manager.remove(*resolved_objs, **kwargs)

    def set(self, objs, **kwargs):
        return self.original_manager.set(self._resolve_objs(objs), **kwargs)

class TenantIsolatedManyToManyDescriptor:
    def __init__(self, original_descriptor):
        self.original_descriptor = original_descriptor

    def __get__(self, instance, instance_type=None):
        manager = self.original_descriptor.__get__(instance, instance_type)
        if instance is None:
            return manager
        return TenantIsolatedManyToManyManager(manager, instance)
