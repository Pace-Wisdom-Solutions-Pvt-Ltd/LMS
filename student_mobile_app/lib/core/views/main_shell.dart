// SPDX-FileCopyrightText: 2026 Pace Wisdom Solutions Pvt. Ltd.
// SPDX-License-Identifier: Apache-2.0

import 'package:lms/utils/app_exports.dart';

/// The four-tab shell.
///
/// Each tab keeps its own navigation stack and scroll position, because the
/// router uses `StatefulShellRoute.indexedStack`. Screens that must cover the
/// tab bar (roadmap, lesson, task, quiz, result) are pushed on
/// the **root** navigator instead of inside a branch.
///
/// The bar is the prototype's `.tabbar` with one deliberate departure: a
/// **solid** surface instead of a translucent one over an 18px blur. It keeps
/// the hairline top border and the 58x32 brand-soft pill that slides between
/// tabs on a spring over 420ms while the active icon lifts and scales.
///
/// On a tablet it becomes a [NavigationRail] — a bar pinned to the bottom of a
/// 10" screen is both a long reach and a waste of the width.
class MainShell extends StatefulWidget {
  const MainShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> with RouteAware {
  StatefulNavigationShell get shell => widget.shell;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // The shell's own route, on the **root** navigator — the one the roadmap,
    // lesson, task, quiz and result screens are pushed over.
    final ModalRoute<void>? route = ModalRoute.of(context);
    if (route != null) appRouteObserver.subscribe(this, route);
  }

  @override
  void dispose() {
    appRouteObserver.unsubscribe(this);
    super.dispose();
  }

  /// The shell is back on top: whatever was pushed over it has closed, and the
  /// learner may have completed a lesson, a task or a quiz while it was gone.
  ///
  /// The tabs cannot tell — they sit in an `IndexedStack`, so they are never
  /// covered and never rebuilt, and Home would keep yesterday's percentage
  /// until the next sign-in. So the shell pulls [TabRefresher] here, which is
  /// the one place that knows every tab reporting progress.
  @override
  void didPopNext() {
    final int? orgId = context.read<SessionProvider>().orgId;
    unawaited(context.read<TabRefresher>().reload(orgId));
  }

  void _go(int index) => shell.goBranch(
    index,
    // Tapping the active tab returns it to its first screen.
    initialLocation: index == shell.currentIndex,
  );

  List<_Tab> _tabs(BuildContext context) => <_Tab>[
    _Tab(Icons.home_outlined, Icons.home_rounded, context.l10n.tabHome),
    _Tab(
      Icons.menu_book_outlined,
      Icons.menu_book_rounded,
      context.l10n.tabCourses,
    ),
    _Tab(
      Icons.bar_chart_outlined,
      Icons.bar_chart_rounded,
      context.l10n.tabProgress,
    ),
    _Tab(
      Icons.person_outline_rounded,
      Icons.person_rounded,
      context.l10n.tabProfile,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final List<_Tab> tabs = _tabs(context);

    if (context.isTablet) {
      return Scaffold(
        body: SafeArea(
          child: Row(
            children: <Widget>[
              NavigationRail(
                selectedIndex: shell.currentIndex,
                onDestinationSelected: _go,
                labelType: NavigationRailLabelType.all,
                backgroundColor: context.colors.surface,
                indicatorColor: context.brand.brandSoft,
                destinations: <NavigationRailDestination>[
                  for (final _Tab t in tabs)
                    NavigationRailDestination(
                      icon: Icon(t.icon),
                      selectedIcon: Icon(t.selectedIcon),
                      label: Text(t.label),
                    ),
                ],
              ),
              const VerticalDivider(width: 1),
              Expanded(child: shell),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      // The bar is **opaque and the body stops above it**. The prototype
      // floats a translucent bar over the content, which needs `extendBody`
      // and leaves every tab's list to reserve the bar's height itself — four
      // hand-kept constants, and text sliding under a blur on the way past.
      // A solid bar costs nothing to read and lets the `Scaffold` do the
      // insetting, so a list only pads for its own breathing room.
      body: shell,
      bottomNavigationBar: _TabBar(
        tabs: tabs,
        currentIndex: shell.currentIndex,
        onTap: _go,
      ),
    );
  }
}

class _TabBar extends StatelessWidget {
  const _TabBar({
    required this.tabs,
    required this.currentIndex,
    required this.onTap,
  });

  final List<_Tab> tabs;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: context.colors.surface,
        border: Border(top: BorderSide(color: context.colors.outline)),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          top: AppSpace.sm,
          left: AppSpace.sm,
          right: AppSpace.sm,
          // 26px in the design, on a device without a home indicator — and
          // now on every device, because [AppFooter] sits below this bar and
          // pays the home indicator's inset. Paying it here as well left an
          // empty band between the tabs and the footer.
          bottom: AppSpace.lg,
        ),
        // No fixed height: the row is as tall as an icon over its label, so it
        // grows with the text scale instead of clipping it. 46px was the
        // design's measurement of exactly that at 1.0x, which stopped being
        // true the moment the OS setting moved.
        child: LayoutBuilder(
          builder: (BuildContext context, BoxConstraints constraints) {
            final double slot = constraints.maxWidth / tabs.length;

            return Stack(
              children: <Widget>[
                // `.tab-ind`: the pill, sliding on a spring.
                AnimatedPositioned(
                  duration: context.reduceMotion
                      ? Duration.zero
                      : const Duration(milliseconds: 420),
                  curve: AppMotion.spring,
                  left: slot * currentIndex,
                  top: 0,
                  width: slot,
                  height: 32,
                  child: Center(
                    child: Container(
                      width: 58,
                      height: 32,
                      decoration: BoxDecoration(
                        color: brand.brandSoft,
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
                Row(
                  children: <Widget>[
                    for (int i = 0; i < tabs.length; i++)
                      Expanded(
                        child: _TabButton(
                          tab: tabs[i],
                          selected: i == currentIndex,
                          onTap: () => onTap(i),
                        ),
                      ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.tab,
    required this.selected,
    required this.onTap,
  });

  final _Tab tab;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final BrandColors brand = context.brand;
    final Color color = selected ? brand.brandText : brand.muted;

    return Semantics(
      button: true,
      selected: selected,
      label: tab.label,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Column(
          // The Stack above now takes its height from this column, so it has
          // to ask for what it needs rather than for everything there is.
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.start,
          children: <Widget>[
            const SizedBox(height: 4),
            // `.tab[aria-current] svg { translateY(-1px) scale(1.06) }`
            AnimatedSlide(
              duration: const Duration(milliseconds: 300),
              curve: AppMotion.spring,
              offset: selected ? const Offset(0, -0.04) : Offset.zero,
              child: AnimatedScale(
                duration: const Duration(milliseconds: 300),
                curve: AppMotion.spring,
                scale: selected ? 1.06 : 1,
                child: Icon(
                  selected ? tab.selectedIcon : tab.icon,
                  size: 23,
                  color: color,
                ),
              ),
            ),
            const SizedBox(height: 3),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 200),
              style: context.text.labelMedium!.copyWith(
                fontSize: fs(11),
                fontWeight: FontWeight.w600,
                color: color,
                height: 1,
              ),
              child: Text(tab.label, maxLines: 1, overflow: TextOverflow.clip),
            ),
          ],
        ),
      ),
    );
  }
}

class _Tab {
  const _Tab(this.icon, this.selectedIcon, this.label);
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}
