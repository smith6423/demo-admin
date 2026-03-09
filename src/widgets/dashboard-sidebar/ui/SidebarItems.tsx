"use client";

import Menuitems, { MenuItem } from "../config/MenuItems";
import { Box } from "@mui/material";
import {
  Logo,
  Sidebar as MUI_Sidebar,
  Menu,
  MenuItem as SidebarMenuItem,
  Submenu,
} from "react-mui-sidebar";
import { IconPoint } from '@tabler/icons-react';
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  permissions: string[];
}

/**
 * requiredPermission 기준 메뉴 아이템 표시 여부 결정
 * - requiredPermission 없음 → 항상 표시 (모든 로그인 사용자)
 * - requiredPermission 있음 → permissions 배열에 포함된 경우만 표시
 */
function hasAccess(item: MenuItem, permissions: string[]): boolean {
  if (!item.requiredPermission) return true;
  return permissions.includes(item.requiredPermission);
}

/**
 * navlabel(섹션 헤더)은 하위에 표시 가능한 메뉴가 1개 이상일 때만 표시
 * 단순화: navlabel의 requiredPermission이 있으면 그 권한을 기준으로 판단
 */
function filterMenuItems(items: MenuItem[], permissions: string[]): MenuItem[] {
  const result: MenuItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.navlabel) {
      // 이 헤더 이후 다음 헤더 전까지 표시 가능한 항목이 있는지 확인
      const nextHeaderIdx = items.findIndex((it, idx) => idx > i && it.navlabel);
      const siblings = items.slice(i + 1, nextHeaderIdx === -1 ? undefined : nextHeaderIdx);
      const hasVisibleChild = siblings.some((s) => hasAccess(s, permissions));
      if (hasVisibleChild) result.push(item);
      continue;
    }

    if (hasAccess(item, permissions)) {
      if (item.children) {
        const filteredChildren = filterMenuItems(item.children, permissions);
        if (filteredChildren.length > 0) {
          result.push({ ...item, children: filteredChildren });
        }
      } else {
        result.push(item);
      }
    }
  }

  return result;
}

const renderMenuItems = (items: MenuItem[], pathDirect: string) => {
  return items.map((item) => {
    const Icon = item.icon ?? IconPoint;
    const itemIcon = <Icon stroke={1.5} size="1.3rem" />;

    if (item.subheader) {
      return <Menu subHeading={item.subheader} key={item.subheader} />;
    }

    if (item.children) {
      return (
        <Submenu
          key={item.id}
          title={item.title}
          icon={itemIcon}
          borderRadius="7px"
        >
          {renderMenuItems(item.children, pathDirect)}
        </Submenu>
      );
    }

    return (
      <Box px={3} key={item.id}>
        <SidebarMenuItem
          isSelected={pathDirect === item.href}
          borderRadius="8px"
          icon={itemIcon}
          link={item.href}
          component={Link}
        >
          {item.title}
        </SidebarMenuItem>
      </Box>
    );
  });
};

const SidebarItems = ({ permissions }: Props) => {
  const pathname = usePathname();
  const visibleItems = filterMenuItems(Menuitems, permissions);

  return (
    <>
      <MUI_Sidebar
        width="100%"
        showProfile={false}
        themeColor="#5D87FF"
        themeSecondaryColor="#49beff"
      >
        <Logo img="/images/logos/dark-logo.svg" component={Link} to="/">
          Admin
        </Logo>
        {renderMenuItems(visibleItems, pathname)}
      </MUI_Sidebar>
    </>
  );
};

export default SidebarItems;
