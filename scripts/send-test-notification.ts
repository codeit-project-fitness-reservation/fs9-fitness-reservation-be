// ADMIN으로 로그인 후 고객에게 알림 발송
const BASE = 'http://localhost:3000';
const CUSTOMER_ID = 'cml4ry4xy00025gv3i8mtckro'; // 테스트 고객

async function main() {
  // 1. ADMIN 로그인
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'test1234' }),
  });

  if (!loginRes.ok) {
    console.error('로그인 실패:', await loginRes.text());
    return;
  }

  const setCookie = loginRes.headers.get('set-cookie') ?? '';
  const accessToken = setCookie.match(/accessToken=([^;]+)/)?.[1];
  if (!accessToken) {
    console.error('accessToken 없음. 응답:', await loginRes.text());
    return;
  }
  console.log('ADMIN 로그인 성공');

  // 2. 알림 5개 연속 발송
  const notifications = [
    { title: '🏋️ 예약이 확정되었습니다', body: '내일 오전 10시 필라테스 수업이 확정되었습니다.', linkUrl: '/my/reservations' },
    { title: '💳 포인트가 적립되었습니다', body: '5,000P가 적립되었습니다. 현재 잔액: 55,000P', linkUrl: '/my/points' },
    { title: '🎟️ 쿠폰이 도착했습니다', body: '신규 회원 할인 쿠폰 10% 쿠폰이 발급되었습니다.', linkUrl: '/my/coupons' },
    { title: '📣 클래스 일정이 변경되었습니다', body: '수요일 요가 수업이 오후 2시로 변경되었습니다.', linkUrl: '/my/reservations' },
    { title: '⭐ 리뷰를 남겨주세요', body: '지난 수업은 어떠셨나요? 소중한 후기를 남겨주세요.', linkUrl: '/my/history' },
  ];

  for (const [i, noti] of notifications.entries()) {
    const notiRes = await fetch(`${BASE}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `accessToken=${accessToken}`,
      },
      body: JSON.stringify({ userId: CUSTOMER_ID, ...noti }),
    });

    const result = await notiRes.json();
    if (notiRes.ok) {
      console.log(`[${i + 1}/5] 발송 성공: ${noti.title}`);
    } else {
      console.error(`[${i + 1}/5] 발송 실패:`, JSON.stringify(result));
    }

    await new Promise((r) => setTimeout(r, 300));
  }
  console.log('완료!');
}

main().catch(console.error);
