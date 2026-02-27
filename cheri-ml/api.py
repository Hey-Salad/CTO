  from transformers import AutoTokenizer, AutoModelForCausalLM
  from fastapi import FastAPI                                                     
  from pydantic import BaseModel                                                  
  import uvicorn
  import torch

  app = FastAPI()

  print('Loading model...')
  tokenizer = AutoTokenizer.from_pretrained('HeySalad/Cheri-ML-1.3B',
  trust_remote_code=True)
  model = AutoModelForCausalLM.from_pretrained('HeySalad/Cheri-ML-1.3B',
  trust_remote_code=True, torch_dtype=torch.float16, device_map='auto')
  print('Model loaded!')

  class Req(BaseModel):
      prompt: str
      max_tokens: int = 100

  @app.get('/health')
  def health():
      return {'status': 'ok'}

  @app.post('/generate')
  def gen(r: Req):
      inputs = tokenizer(r.prompt, return_tensors='pt').to(model.device)
      outputs = model.generate(**inputs, max_new_tokens=r.max_tokens)
      text = tokenizer.decode(outputs[0][len(inputs.input_ids[0]):],
  skip_special_tokens=True)
      return {'text': text}

  uvicorn.run(app, host='0.0.0.0', port=8000)
