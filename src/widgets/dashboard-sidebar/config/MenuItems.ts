import {
  IconAperture,
  IconCopy,
  IconLayoutDashboard,
  IconMoodHappy,
  IconTypography,
  IconUsers,
  IconShield,
  IconClipboardList,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

export interface MenuItem {
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: React.ElementType;
  href?: string;
  // permission code가 없으면 모든 로그인 사용자에게 표시
  // permission code가 있으면 세션의 permissions 배열에 포함된 경우에만 표시
  requiredPermission?: string;
  children?: MenuItem[];
}

const Menuitems: MenuItem[] = [
  {
    navlabel: true,
    subheader: "HOME",
  },
  {
    id: uniqueId(),
    title: "대시보드",
    icon: IconLayoutDashboard,
    href: "/",
    requiredPermission: "dashboard:view",
  },

  // ── 관리자 전용 ─────────────────────────────────────────
  {
    navlabel: true,
    subheader: "관리자",
    requiredPermission: "admin:users", // 이 헤더는 하위 메뉴 중 하나라도 보일 때 표시
  },
  {
    id: uniqueId(),
    title: "회원 관리",
    icon: IconUsers,
    href: "/admin/users",
    requiredPermission: "admin:users",
  },
  {
    id: uniqueId(),
    title: "권한 관리",
    icon: IconShield,
    href: "/admin/roles",
    requiredPermission: "admin:roles",
  },

  // ── 디자인 (USER 이상) ───────────────────────────────────
  {
    navlabel: true,
    subheader: "디자인",
    requiredPermission: "design:icons",
  },
  {
    id: uniqueId(),
    title: "아이콘",
    icon: IconMoodHappy,
    href: "/design/icons",
    requiredPermission: "design:icons",
  },
  {
    id: uniqueId(),
    title: "샘플 페이지",
    icon: IconAperture,
    href: "/design/sample-page",
    requiredPermission: "design:sample",
  },
  {
    id: uniqueId(),
    title: "타이포그래피",
    icon: IconTypography,
    href: "/design/typography",
    requiredPermission: "design:typo",
  },
  {
    id: uniqueId(),
    title: "그림자",
    icon: IconCopy,
    href: "/design/shadow",
    requiredPermission: "design:shadow",
  },
];

export default Menuitems;
