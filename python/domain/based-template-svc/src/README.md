deploy
各テナントの起動コマンド

<!-- フロント -->

npm run dev:filter --filter=based-template-app

<!-- バック -->

npm run uv:dev:filter --uvdev=based-template-svc

npm run uv:lint:filter --uvdev=based-template-svc
npm run uv:format:filter --uvdev=based-template-svc

INSERT INTO `based-template-vbf6m_prod_fix_db`.`user` (
user_id,
user_name,
email,
tenant_role,
created_at,
updated_at
) VALUES (
'ihTXNSwcQeNTU7EdJYq14pDolBQ2',
'takumi',
'example@gmail.com',
'TENANT_ADMIN',
NOW(),
NOW()
);

INSERT INTO `based_template_dev_db`.`user` (
user_id,
user_name,
email,
tenant_role,
created_at,
updated_at
) VALUES (
'ihTXNSwcQeNTU7EdJYq14pDolBQ2',
'takumi',
'example@gmail.com',
'TENANT_ADMIN',
NOW(),
NOW()
);

INSERT INTO `based_template_stg_db`.`user` (
user_id,
user_name,
email,
tenant_role,
created_at,
updated_at
) VALUES (
'ihTXNSwcQeNTU7EdJYq14pDolBQ2',
'takumi',
'example@gmail.com',
'TENANT_ADMIN',
NOW(),
NOW()
);

INSERT INTO `based_template_prod_db`.`user` (
user_id,
user_name,
email,
tenant_role,
created_at,
updated_at
) VALUES (
'ihTXNSwcQeNTU7EdJYq14pDolBQ2',
'takumi',
'example@gmail.com',
'TENANT_ADMIN',
NOW(),
NOW()
);
