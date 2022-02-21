
from auto_deploy import deploy_naughty_token, deploy_naughty_pool, deploy_naughty_mining
from auto_deploy import startLottery, closeLottery, drawLotteryRound, settlePurchaseIncentive

import asyncio, os
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from lark_notification import lark_notification

# from pytz import timezone



if __name__ == '__main__':
    scheduler = AsyncIOScheduler(timezone = 'Asia/Shanghai')
    scheduler.add_job(func = deploy_naughty_token, args = ["BTC", 0.1], trigger = 'cron',  hour = 15, minute = 54, second = 0)
    scheduler.add_job(func = deploy_naughty_pool, args = ["BTC", "MockUSD"], trigger = 'cron',  hour = 15, minute = 55, second = 20)
    scheduler.add_job(func = deploy_naughty_mining, args = ["BTC"], trigger = 'cron',  hour = 15, minute = 56, second = 40)

    scheduler.add_job(func = deploy_naughty_token, args = ["ETH", 0.1], trigger = 'cron',  hour = 15, minute = 55, second = 0)
    scheduler.add_job(func = deploy_naughty_pool, args = ["ETH", "MockUSD"], trigger = 'cron',  hour = 15, minute = 56, second = 20)
    scheduler.add_job(func = deploy_naughty_mining, args = ["ETH"], trigger = 'cron',  hour = 15, minute = 57, second = 40)

    scheduler.add_job(func = deploy_naughty_token, args = ["AVAX", 0.1], trigger = 'cron',  hour = 15, minute = 56,  second = 0)
    scheduler.add_job(func = deploy_naughty_pool, args = ["AVAX", "MockUSD"], trigger = 'cron',  hour = 15, minute = 57, second = 20)
    scheduler.add_job(func = deploy_naughty_mining, args = ["AVAX"], trigger = 'cron',  hour = 15, minute = 58, second = 40)
    
    # scheduler.add_job(deploy_naughty_pool("BTC", "USDC"), 'cron', day = "7", hour = "17", minute = "35")
    # scheduler.add_job(deploy_naughty_token("ETH", 0.2), 'cron', day = "7", hour = "17", minute = "40")
    # scheduler.add_job(deploy_naughty_pool("ETH", "USDC"), 'cron', day = "7", hour = "17", minute = "45")
    # scheduler.add_job(deploy_naughty_token("AVAX", 0.2), 'cron', day = "7", hour = "17", minute = "50")
    # scheduler.add_job(deploy_naughty_pool("AVAX", "USDC"), 'cron', day = "7", hour = "17", minute = "55")
    # deploy_naughty_token('BTC', 0.2)
    
    scheduler.add_job(func = closeLottery, trigger = "cron", hour = 16, minute = 1)
    scheduler.add_job(func = drawLotteryRound, trigger = "cron", hour = 16, minute = 3)
    scheduler.add_job(func = startLottery, trigger = "cron", hour = 16, minute = 5)

    scheduler.add_job(func = settlePurchaseIncentive, trigger = "cron", hour = 16, minute = 0)

    scheduler.start()
    print('Press Ctrl+{0} to exit'.format('Break' if os.name == 'nt' else 'C'))

    # Execution will block here until Ctrl+C (Ctrl+Break on Windows) is pressed.
    try:
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        pass
    