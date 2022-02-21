from bs4 import BeautifulSoup as BS
import requests
import datetime, json
import os, platform

from lark_notification import lark_notification

# the full directory of Degis-Core
UNIX_CORE_PATH = '/home/shangzh/Degis-Contract/Degis-Core/'
MAC_CORE_PATH = '/Users/liyang/Code/Solidity/Degis/Degis-Core/'

NETWORK = 'fuji'
FEE = 20
REWARD = 0.25

def get_token_info(token) -> dict:
    if token == 'BTC':
        token_str = 'bitcoin'
    elif token == 'ETH':
        token_str = 'ethereum'
    elif token == 'AVAX':
        token_str = 'avalanche'
    else:
        return {}
    request_url = f'https://coinmarketcap.com/currencies/{token_str}/markets/'
    response = requests.get(request_url)
    response_obj = BS(response.text, 'lxml')
    price_obj = response_obj.select('.priceValue')[0]

    return {
        'token': token,
        'price': float(price_obj.text[1: ].replace(',', ''))
    }

def get_coin_address(token) -> str:
    '''
    get address of ERC20, like, MockUSD, stable coin, DEG etc.
    :param token: token name
    :return: address
    '''
    # token = 'MockUSD'
    if platform.platform()[: 5] == 'Linux':
        address_path = UNIX_CORE_PATH + 'info/address.json'
    else:
        address_path = MAC_CORE_PATH + 'info/address.json'
    with open(address_path ) as f:
        address_info = json.load(f)
        f.close()
    return address_info[NETWORK][token]

def deploy_naughty_token(token, percentage):
    '''
    deploy naughty price token with two directions
    :param token: underlying token, i.e. BTC, ETH,AVAX
    :param percentage: percentage away from current price
    :return: no return, just deploy the pools
    '''

    print("Time is: ", datetime.datetime.now())
    # token, percentage = 'BTC', 0.1
    price_info = get_token_info(token)
    price = price_info['price']

    # calculate strike price for call & put
    call_strike = round(price * (1 + percentage), 2)
    put_strike = round(price * (1 - percentage), 2)

    # calculate timestamp for deadline & settlement
    dates_to_deadline = 30
    dates_to_settle = 40
    current_date = datetime.datetime.now()
    deadline_timestamp = int((current_date + datetime.timedelta(days=dates_to_deadline)).timestamp())
    settle_timestamp = int((current_date + datetime.timedelta(days=dates_to_settle)).timestamp())

    # round_info = str(current_date).replace('-', '')[2: 6]
    round_info = "2205"

    # npx hardhat deployNPToken --name BTC --k 49830.0 --decimals 0 --iscall 1 --round 2201 --deadline 1644868800 --settletime 1644883200 --network fuji
    deploy_call = f"npx hardhat deployNPToken --name {token} --k {call_strike} --decimals 2 --iscall 1 --round {round_info} --deadline {deadline_timestamp} --settletime {settle_timestamp} --network {NETWORK}"
    deploy_put = f"npx hardhat deployNPToken --name {token} --k {put_strike} --decimals 2 --iscall 0 --round {round_info} --deadline {deadline_timestamp} --settletime {settle_timestamp} --network {NETWORK}"

    call_token_name = f"{token}_{call_strike}_H_{round_info}"
    put_token_name = f"{token}_{put_strike}_L_{round_info}"

    try:
        if platform.platform()[: 5] == 'Linux':
            deploy_path = UNIX_CORE_PATH
        else:
            deploy_path = MAC_CORE_PATH
        os.system(f'cd {deploy_path} && pwd && {deploy_call}')
        print(f"Token {token} call {call_strike} deployed")
        os.system(f'cd {deploy_path} && pwd && {deploy_put}')
        print(f"Token {token} put {put_strike} deployed")

        lark_notification(call_token_name)
        lark_notification(put_token_name)

    except Exception:
        print(f'Token {token} failed with {Exception}')
        lark_notification("token deploy failed", True)

def deploy_naughty_pool(token, stable_coin):
    '''
    note that you should execute deploy_naughty_token firstly then you could
    :param token: underlying token name, like, BTC
    :param stable_coin: stable coin name, like MockUSD
    :return: no return, deploy naughty pool
    '''
    # token, stable_coin = 'BTC', 'MockUSD'
    if platform.platform()[: 5] == 'Linux':
        address_path = UNIX_CORE_PATH + 'info/NPToken.json'
    else:
        address_path = MAC_CORE_PATH + 'info/NPToken.json'
    with open(address_path, ) as f:
        address_info = json.load(f)
        f.close()
    current_date = datetime.datetime.now()
    round_info = str(current_date).replace('-', '')[2: 6]
    naughty_tokens = list(address_info[NETWORK].keys())[::-1]

    # token name here
    call_token = [_ for _ in naughty_tokens if ((token in _) and (round_info in _) and
                                                ('H' in _))][0]
    put_token = [_ for _ in naughty_tokens if ((token in _) and (round_info in _) and
                                                ('H' in _))][0]

    # stable coin address
    stable_coin_address = get_coin_address(stable_coin)

    # deadline timestamp
    dates_to_deadline = 30
    deadline_timestamp = int((current_date + datetime.timedelta(days=dates_to_deadline)).timestamp())

    deploy_call_pool = f"npx hardhat deployNPPool --name {call_token} --stablecoin {stable_coin_address} --deadline {deadline_timestamp} --fee {FEE} --network {NETWORK}"
    deploy_put_pool = f"npx hardhat deployNPPool --name {put_token} --stablecoin {stable_coin_address} --deadline {deadline_timestamp} --fee {FEE} --network {NETWORK}"


    call_tokenpool_name = f"{call_token} Pool"
    put_tokenpool_name = f"{put_token} Pool"

    try:
        if platform.platform()[: 5] == 'Linux':
            deploy_path = UNIX_CORE_PATH
        else:
            deploy_path = MAC_CORE_PATH
        os.system(f'cd {deploy_path} && pwd && {deploy_call_pool}')
        print(f"Token {call_token} swap pool deployed")
        os.system(f'cd {deploy_path} && pwd && {deploy_put_pool}')
        print(f"Token {put_token} swap pool deployed")


        lark_notification(call_tokenpool_name)
        lark_notification(put_tokenpool_name)

    except Exception:
        print(f'Token {token} failed with {Exception}')
        lark_notification("pool deploy failed", True)

def deploy_naughty_mining(token):
    if platform.platform()[: 5] == 'Linux':
        address_path = UNIX_CORE_PATH + 'info/NPPool.json'
    else:
        address_path = MAC_CORE_PATH + 'info/NPPool.json'
    with open(address_path, ) as f:
        address_info = json.load(f)
        f.close()
    current_date = datetime.datetime.now()
    round_info = str(current_date).replace('-', '')[2: 6]
    naughty_tokens = list(address_info[NETWORK].keys())[::-1]

    # token name here
    call_token = [_ for _ in naughty_tokens if ((token in _) and (round_info in _) and
                                                ('H' in _))][0]
    put_token = [_ for _ in naughty_tokens if ((token in _) and (round_info in _) and
                                                ('H' in _))][0]

    # NP pool address
    call_pool_address = address_info[NETWORK][call_token]['poolAddress']
    put_pool_address = address_info[NETWORK][put_token]['poolAddress']


    deploy_call_pool = f"npx hardhat addFarmingPool --name {call_token} --address {call_pool_address} --reward {REWARD} --network {NETWORK}"
    deploy_put_pool = f"npx hardhat addFarmingPool --name {put_token} --address {put_pool_address} --reward {REWARD} --network {NETWORK}"


    call_tokenpool_name = f"{call_token} Mining Pool"
    put_tokenpool_name = f"{put_token} Mining Pool"

    try:
        if platform.platform()[: 5] == 'Linux':
            deploy_path = UNIX_CORE_PATH
        else:
            deploy_path = MAC_CORE_PATH
        os.system(f'cd {deploy_path} && pwd && {deploy_call_pool}')
        print(f"Token {call_token} mining pool deployed")
        os.system(f'cd {deploy_path} && pwd && {deploy_put_pool}')
        print(f"Token {put_token} mining pool deployed")

        lark_notification(call_tokenpool_name)
        lark_notification(put_tokenpool_name)

    except Exception:
        print(f'Token {token} failed with {Exception}')
        lark_notification("mining deploy failed", True)

def settlePurchaseIncentive(): 
    settle_purchaseIncentive_call = f"npx hardhat settlePurchaseIncentive --network {NETWORK}"
    
    try:
        if platform.platform()[: 5] == 'Linux':
            deploy_path = UNIX_CORE_PATH
        else:
            deploy_path = MAC_CORE_PATH

        os.system(f'cd {deploy_path} && pwd && {settle_purchaseIncentive_call}')
        print(f"Purchase incentive vault settled")

        lark_notification("Purchase incentive vault settled")
        
    except Exception:
        print(f'Purchase incentive settlement failed with {Exception}')
        lark_notification("Purchase incentive settlement failed", True)

def closeLottery(): 
    close_lottery_call = f"npx hardhat closeLotteryRound --network {NETWORK}"
    
    try:
        if platform.platform()[: 5] == 'Linux':
            deploy_path = UNIX_CORE_PATH
        else:
            deploy_path = MAC_CORE_PATH
            
        os.system(f'cd {deploy_path} && pwd && {close_lottery_call}')
        print(f"Lottery round closed")

        lark_notification("Lottery round closed")
        
    except Exception:
        print(f'Close lottery failed with {Exception}')
        lark_notification("lottery close failed", True)

def startLottery(): 
    dates_to_closeLottery = 1
    current_date = datetime.datetime.now()

    deadline_timestamp = int((current_date + datetime.timedelta(days=dates_to_closeLottery)).timestamp())
    start_lottery_call = f"npx hardhat startLotteryRound --end {deadline_timestamp} --network {NETWORK}"
    
    try:
        if platform.platform()[: 5] == 'Linux':
            deploy_path = UNIX_CORE_PATH
        else:
            deploy_path = MAC_CORE_PATH
            
        os.system(f'cd {deploy_path} && pwd && {start_lottery_call}')
        print(f"New lottery round started")

        lark_notification("New lottery round started")
        
    except Exception:
        print(f'Purchase incentive settlement failed with {Exception}')

        lark_notification("New lottery round start failed", True)


def drawLotteryRound(): 
    draw_lottery_call = f"npx hardhat drawLotteryRound --network {NETWORK}"
    
    try:
        if platform.platform()[: 5] == 'Linux':
            deploy_path = UNIX_CORE_PATH
        else:
            deploy_path = MAC_CORE_PATH
            
        os.system(f'cd {deploy_path} && pwd && {draw_lottery_call}')
        print(f"Lottery round draw")

        lark_notification("Lottery round draw")
        
    except Exception:
        print(f'Lottery round draw failed with {Exception}')

        lark_notification("Lottery round draw failed", True)

def deploy_default():
    percentage = 0.2
    stable_coin = 'MockUSD'
    for token in ['BTC', 'ETH', 'AVAX']:
        deploy_naughty_token(token, percentage)
        deploy_naughty_pool(token, stable_coin)
        deploy_naughty_mining(token)

if __name__ == '__main__':
    pass
    # deploy_naughty_token('BTC', 0.1)
    # deploy_naughty_pool('BTC', 'MockUSD')
    # deploy_naughty_mining('BTC')