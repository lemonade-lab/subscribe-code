var config = [
	{
		title: "仓库管理",
		list: [
			{
				title: "/code add -g url",
				desc: "添加(全局)仓库"
			},
			{
				title: "/code del -g url",
				desc: "删除(全局)仓库"
			},
			{
				title: "/code list -g",
				desc: "查看(全局)仓库列表"
			}
		]
	},
	{
		title: "权限管理",
		list: [
			{
				title: "/codem add @user",
				desc: "新增仓库管理员 | 主人"
			},
			{
				title: "/codem del @user",
				desc: "删除仓库管理员 ｜ 主人"
			},
			{
				title: "/codeu add @user",
				desc: "新增白名单用户 ｜ 主人/管理"
			},
			{
				title: "/codeu del @user",
				desc: "新增白名单用户 ｜ 主人/管理"
			}
		]
	}
];

export { config as default };
