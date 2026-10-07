# SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
# SPDX-License-Identifier: Apache-2.0

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from .models import User, InviteToken



class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = "__all__"


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("email", "first_name", "last_name")


class CustomUserAdmin(UserAdmin):
    model = User
    form = CustomUserChangeForm
    add_form = CustomUserCreationForm

    list_display = (
        "email",
        "first_name",
        "last_name",
        "get_roles",
        "is_staff",
        "is_active",
        "reinvite_count",
        "last_invited_at",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "status")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("email",)
    filter_horizontal = ("groups", "user_permissions")

    def get_roles(self, obj):
        return ", ".join([ur.role.name for ur in obj.roles.all()])
    get_roles.short_description = "Roles"

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("roles__role")

    readonly_fields = ("id", "date_joined", "last_login")
    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "profile_picture", "phone_number", "status")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
        ("Invite Tracking", {"fields": ("reinvite_count", "last_invited_at")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2"),
            },
        ),
    )


admin.site.register(User, CustomUserAdmin)



@admin.register(InviteToken)
class InviteTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "attempt_number", "is_revoked", "created_at", "expires_at", "created_by", "organization")
    list_filter = ("is_revoked", "organization")
    search_fields = ("user__email", "token")
    readonly_fields = ("id", "token", "created_at", "expires_at", "attempt_number", "created_by", "organization")
    ordering = ("-created_at",)