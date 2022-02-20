from auto.auto_deploy import startLottery
from auto_deploy import deploy_naughty_token, deploy_naughty_pool, deploy_naughty_mining
from auto_deploy import startLottery

import asyncio, os
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# from pytz import timezone



if __name__ == '__main__':
    scheduler = AsyncIOScheduler(timezone = 'Asia/Shanghai')
    scheduler.add_job(func = deploy_naughty_token, args = ["BTC", 0.2], trigger = 'cron',  hour = 21, minute = 15)
    # scheduler.add_job(deploy_naughty_pool("BTC", "USDC"), 'cron', day = "7", hour = "17", minute = "35")
    # scheduler.add_job(deploy_naughty_token("ETH", 0.2), 'cron', day = "7", hour = "17", minute = "40")
    # scheduler.add_job(deploy_naughty_pool("ETH", "USDC"), 'cron', day = "7", hour = "17", minute = "45")
    # scheduler.add_job(deploy_naughty_token("AVAX", 0.2), 'cron', day = "7", hour = "17", minute = "50")
    # scheduler.add_job(deploy_naughty_pool("AVAX", "USDC"), 'cron', day = "7", hour = "17", minute = "55")
    # deploy_naughty_token('BTC', 0.2)
    
    scheduler.add_job(func = startLottery, trigger = "cron", dayofweek = "mon", hour = 17, minuter = 30)
    
    scheduler.start()
    print('Press Ctrl+{0} to exit'.format('Break' if os.name == 'nt' else 'C'))

    # Execution will block here until Ctrl+C (Ctrl+Break on Windows) is pressed.
    try:
        asyncio.get_event_loop().run_forever()
    except (KeyboardInterrupt, SystemExit):
        pass
    