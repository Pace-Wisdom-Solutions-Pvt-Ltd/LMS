// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'dart:io';

import 'package:lms/utils/app_exports.dart';

/// Editing name, phone and profile picture.
class EditProfileScreen extends StatelessWidget {
  const EditProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final AppUser? user = context.read<SessionProvider>().user;
    if (user == null) {
      return Scaffold(
        appBar: const AppTopBar(),
        body: EmptyState(
          icon: Icons.person_off_outlined,
          title: context.l10n.profileUnavailable,
        ),
      );
    }

    return ChangeNotifierProvider<EditProfileViewModel>(
      create: (_) => EditProfileViewModel(user: user),
      child: const _EditProfileView(),
    );
  }
}

class _EditProfileView extends StatefulWidget {
  const _EditProfileView();

  @override
  State<_EditProfileView> createState() => _EditProfileViewState();
}

class _EditProfileViewState extends State<_EditProfileView> {
  late final EditProfileViewModel _vm = context.read<EditProfileViewModel>();
  late final TextEditingController _first = TextEditingController(
    text: _vm.firstName,
  );
  late final TextEditingController _last = TextEditingController(
    text: _vm.lastName,
  );
  late final TextEditingController _phone = TextEditingController(
    text: _vm.phoneNumber,
  );

  @override
  void dispose() {
    _first.dispose();
    _last.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto(EditProfileViewModel vm) async {
    await showAppSheet<void>(
      context,
      title: context.l10n.profilePhoto,
      child: const SizedBox.shrink(),
      actions: <Widget>[
        AppButton(
          label: context.l10n.photoChoose,
          icon: Icons.photo_library_outlined,
          onPressed: () {
            Navigator.of(context).pop();
            vm.pickImage();
          },
        ),
        if (vm.pickedImagePath != null)
          AppButton(
            label: context.l10n.photoRemove,
            tone: ChipTone.danger,
            onPressed: () {
              Navigator.of(context).pop();
              vm.clearPickedImage();
            },
          ),
      ],
    );
  }

  Future<void> _save(EditProfileViewModel vm) async {
    FocusScope.of(context).unfocus();
    final AppUser? updated = await vm.save(context.l10n);
    if (!mounted) return;

    if (updated != null) {
      // Push it into the session so every screen showing the old name updates
      // without a refetch.
      await context.read<SessionProvider>().setUser(updated);
      if (!mounted) return;
    }

    if (vm.state == ViewState.error) {
      showAppSnackBar(context, vm.errorMessage, tone: ChipTone.danger);
      return;
    }

    showAppSnackBar(context, context.l10n.profileSaved, tone: ChipTone.success);
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final EditProfileViewModel vm = context.watch<EditProfileViewModel>();
    final AppLocalizations l10n = context.l10n;

    return Scaffold(
      appBar: AppTopBar(title: Text(l10n.editProfile)),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.only(bottom: AppSpace.xxl),
          children: <Widget>[
            SizedBox(height: AppSpace.md),
            ResponsiveBody(
              maxWidth: context.isTablet ? 460 : double.infinity,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: staggered(<Widget>[
                  Center(
                    child: _PhotoPicker(vm: vm, onTap: () => _pickPhoto(vm)),
                  ),
                  const SizedBox(height: AppSpace.xxl),
                  AppTextField(
                    label: l10n.firstName,
                    hint: l10n.firstNameHint,
                    controller: _first,
                    errorText: vm.visibleFirstNameError,
                    textInputAction: TextInputAction.next,
                    enabled: !vm.isBusy,
                    onChanged: (String v) => vm.onFirstNameChanged(l10n, v),
                    onBlur: () => vm.onFirstNameBlur(l10n),
                  ),
                  const SizedBox(height: AppSpace.lg),
                  AppTextField(
                    label: l10n.lastName,
                    hint: l10n.lastNameHint,
                    controller: _last,
                    textInputAction: TextInputAction.next,
                    enabled: !vm.isBusy,
                    onChanged: vm.onLastNameChanged,
                  ),
                  const SizedBox(height: AppSpace.lg),
                  AppTextField(
                    label: l10n.phoneNumber,
                    hint: l10n.phoneHint,
                    controller: _phone,
                    errorText: vm.visiblePhoneError,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.done,
                    enabled: !vm.isBusy,
                    onChanged: (String v) => vm.onPhoneChanged(l10n, v),
                    onBlur: () => vm.onPhoneBlur(l10n),
                  ),
                  const SizedBox(height: AppSpace.lg),
                  // Email is the sign-in identity and is not editable here.
                  _ReadOnlyRow(label: l10n.emailLabel, value: vm.user.email),
                  const SizedBox(height: AppSpace.xxl),
                  AppButton(
                    label: l10n.save,
                    busy: vm.isBusy,
                    onPressed: vm.canSave ? () => _save(vm) : null,
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PhotoPicker extends StatelessWidget {
  const _PhotoPicker({required this.vm, required this.onTap});

  final EditProfileViewModel vm;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final String? picked = vm.pickedImagePath;
    final String? remote = vm.user.profilePicture;

    ImageProvider<Object>? image;
    if (picked != null) {
      image = FileImage(File(picked));
    } else if ((remote ?? '').isNotEmpty) {
      image = NetworkImage(remote!);
    }

    return PressScale(
      onTap: onTap,
      child: Stack(
        alignment: Alignment.bottomRight,
        children: <Widget>[
          CircleAvatar(
            radius: 48,
            backgroundColor: brand.brandSoft,
            foregroundImage: image,
            child: Text(
              vm.user.initials,
              style: context.text.titleLarge?.copyWith(
                color: brand.brandText,
                fontSize: fs(30),
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: brand.brandFill,
              shape: BoxShape.circle,
              border: Border.all(color: context.colors.surface, width: 2),
            ),
            child: Icon(Icons.edit_rounded, size: 15, color: brand.onBrand),
          ),
        ],
      ),
    );
  }
}

class _ReadOnlyRow extends StatelessWidget {
  const _ReadOnlyRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: <Widget>[
      Text(
        label,
        style: context.text.bodySmall?.copyWith(
          fontSize: fs(13),
          fontWeight: FontWeight.w600,
          color: context.brand.muted,
        ),
      ),
      const SizedBox(height: AppSpace.xs),
      Container(
        height: 52,
        alignment: Alignment.centerLeft,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
        decoration: BoxDecoration(
          color: context.colors.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(AppRadius.input),
        ),
        child: Row(
          children: <Widget>[
            Expanded(
              child: Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.text.bodyLarge?.copyWith(
                  fontSize: fs(16),
                  color: context.brand.muted,
                ),
              ),
            ),
            Icon(
              Icons.lock_outline_rounded,
              size: 16,
              color: context.brand.muted,
            ),
          ],
        ),
      ),
    ],
  );
}
